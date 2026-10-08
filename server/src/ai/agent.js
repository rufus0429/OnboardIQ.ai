const { ai } = require('./gemini');
const { systemPrompt } = require('./prompts/system');
const { tools, toolDeclarations } = require('./tools');
const { env } = require('../config/env');
const { DiagnosisResultSchema, NudgeSchema } = require('../validation/aiSchemas');
const { logger } = require('../app');
const { getUserJourney } = require('../repo/endUsers');
const { getLatestDiagnosis } = require('../repo/diagnoses');

async function runAgentAnalysis(ctx) {
  let iteration = 0;
  const maxIterations = 6;
  
  const messages = [
    { role: 'user', parts: [{ text: 'Begin your analysis of the onboarding funnel.' }] }
  ];
  
  const agentTrace = [];
  ctx.agentTrace = agentTrace;

  while (iteration < maxIterations) {
    iteration++;
    try {
      // Setup payload for @google/genai
      const reqConfig = {
        systemInstruction: systemPrompt,
        tools: [{ functionDeclarations: toolDeclarations }],
        temperature: 0.2
      };

      let response;
      try {
        response = await ai.models.generateContent({
          model: env.GEMINI_MODEL || 'gemini-2.5-flash',
          contents: messages,
          config: reqConfig
        });
      } catch (error) {
        logger.error('Gemini error during diagnosis: ' + error.message);
        throw Object.assign(new Error('AI analysis is temporarily unavailable.'), { code: 'AI_UNAVAILABLE', retryable: true });
      }

      const message = response.candidates[0].content;
      messages.push(message); // Save assistant message

      const parts = message.parts || [];
      const functionCalls = parts.filter(p => p.functionCall);

      if (functionCalls.length > 0) {
        // Execute tools
        const functionResponses = [];
        for (const call of functionCalls) {
          const name = call.functionCall.name;
          const args = call.functionCall.args;
          
          let result;
          try {
            if (tools[name]) {
              result = await tools[name].execute(args, ctx);
              agentTrace.push({
                tool: name,
                args: args, // In production, redact PII from args
                resultSummary: `Executed successfully.`
              });
            } else {
              result = { error: `Tool ${name} not found` };
            }
          } catch (err) {
            result = { error: err.message };
            agentTrace.push({ tool: name, error: err.message });
          }

          functionResponses.push({
            functionResponse: {
              name,
              response: result
            }
          });
        }
        
        messages.push({ role: 'user', parts: functionResponses });
        continue; // Loop again to let model think about tool results
      }

      // No function call means it should have returned structured JSON text or it's done
      const textPart = parts.find(p => p.text);
      if (textPart && textPart.text) {
        // Try parsing as final Diagnosis JSON
        try {
          const jsonText = textPart.text.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(jsonText);
          
          // Validate
          const validated = DiagnosisResultSchema.parse(parsed);
          
          return {
            ok: true,
            diagnosis: validated,
            agentTrace
          };
        } catch (parseError) {
          // Send error back to model for 1 retry
          if (iteration < maxIterations) {
             messages.push({ role: 'user', parts: [{ text: `Validation Error: ${parseError.message}. Please fix your JSON output.` }] });
             continue;
          } else {
             throw new Error('Failed to produce valid structured output after retries.');
          }
        }
      }

      // If we reach here, model did nothing useful
      throw new Error('Model returned no function calls and no text.');

    } catch (error) {
      if (error.status === 429 || error.status >= 500) {
        // Simple backoff could be implemented here
        throw new Error('Gemini API Error: ' + error.message);
      }
      throw error;
    }
  }

  throw new Error('Exceeded maximum agent iterations.');
}

async function generateIntervention(ownerUid, workspaceId, endUserId, currentStep) {
  // Fetch real user data and diagnosis context
  const journey = await getUserJourney(ownerUid, workspaceId, endUserId);
  const diagnosis = await getLatestDiagnosis(ownerUid, workspaceId);

  const userData = journey ? journey.user : { id: endUserId };
  const userEvents = journey ? journey.events : [];
  
  const prompt = `You are OnboardIQ's autonomous recovery agent.
Generate a personalized email for a user who is stuck.

Context:
User First Name: ${userData.traits?.firstName || 'User'}
User Plan: ${userData.traits?.plan || 'Unknown'}
Company Size: ${userData.traits?.companySize || 'Unknown'}
Signup Source: ${userData.traits?.source || 'Unknown'}
Stalled Step: ${currentStep}
Last Activity: ${userEvents.length > 0 ? new Date(userEvents[userEvents.length-1].tsMs).toISOString() : 'Unknown'}

Recent Events:
${userEvents.slice(-5).map(e => `- ${e.step} at ${new Date(e.tsMs).toISOString()}`).join('\n')}

System Diagnosis for this drop-off:
Root Cause: ${diagnosis?.stallCause || 'Unknown'}
Hypothesis: ${diagnosis?.hypothesis || 'Unknown'}
Evidence: ${JSON.stringify(diagnosis?.evidence || [])}

Requirements:
- <120 words
- Use the user's first name
- Reference the stalled step naturally
- Provide EXACTLY ONE clear Call-To-Action (CTA)
- No guilt, manipulation, or fake urgency
- No fabricated facts
- Output ONLY a JSON object with keys: subject (string), body (string), tone ("friendly"|"concise"|"helpful_expert").
`;
  
  const reqConfig = {
    systemInstruction: systemPrompt,
    temperature: 0.2,
    responseMimeType: 'application/json'
  };
  
  let response;
  try {
    response = await ai.models.generateContent({
      model: env.GEMINI_MODEL || 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: reqConfig
    });
  } catch (error) {
    logger.error('Gemini error during nudge generation: ' + error.message);
    throw Object.assign(new Error('AI nudge generation is temporarily unavailable.'), { code: 'AI_UNAVAILABLE', retryable: true });
  }
  
  const textPart = response.candidates?.[0]?.content?.parts?.find(p => p.text);
  if (!textPart) return null;
  
  let parsed;
  try {
    const jsonText = textPart.text.replace(/```json/gi, '').replace(/```/g, '').trim();
    parsed = JSON.parse(jsonText);
  } catch (e) {
    console.error('Failed to parse Gemini output:', textPart.text);
    return null;
  }
  let validated;
  try {
    validated = NudgeSchema.parse({ ...parsed, endUserId });
  } catch (e) {
    console.error('Validation failed:', e.message);
    return null;
  }

  const { db } = require('../config/firebase');
  // Create intervention record
  const docRef = db.collection('interventions').doc();
  const draft = {
    id: docRef.id,
    workspaceId,
    ownerUid,
    endUserId,
    stalledStep: currentStep,
    subject: validated.subject,
    body: validated.body,
    tone: validated.tone,
    status: 'drafted',
    createdAtMs: Date.now()
  };
  
  await docRef.set(draft);
  return draft;
}

module.exports = { runAgentAnalysis, generateIntervention };
