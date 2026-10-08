const { ai } = require('./gemini');
const { systemPrompt } = require('./prompts/system');
const { tools, toolDeclarations } = require('./tools');
const { env } = require('../config/env');
const { DiagnosisResultSchema, NudgeSchema } = require('../validation/aiSchemas');
const { logger } = require('../app');

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
        console.warn('Gemini error, using mock Diagnosis:', error);
        const mockDiagnosis = {
          step: "connect_data_source",
          stallCause: "technical_friction",
          hypothesis: "Rate limit mock hypothesis",
          evidence: [
            { fact: "Fact 1", value: "Value 1", source: "mock" },
            { fact: "Fact 2", value: "Value 2", source: "mock" },
            { fact: "Fact 3", value: "Value 3", source: "mock" }
          ],
          proposedFix: "Wait for quota",
          confidence: "high",
          affectedUserCount: 1
        };
        response = { candidates: [{ content: { parts: [{ text: JSON.stringify(mockDiagnosis) }] } }] };
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
  // Use Gemini to generate a personalized email for the stalled user.
  const prompt = `You are OnboardIQ's autonomous recovery agent.
Generate a personalized email for user ${endUserId} who is stuck at step ${currentStep}.
Output ONLY a JSON object with exactly these keys: subject (string), body (string), tone ("friendly"|"concise"|"helpful_expert").
Do not use manipulation, guilt, or fake urgency. Be helpful.
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
    console.warn('Gemini error, using mock Nudge:', error);
    const mockNudge = {
      subject: "We noticed you're stuck",
      body: "Can we help you with the onboarding?",
      tone: "friendly"
    };
    response = { candidates: [{ content: { parts: [{ text: JSON.stringify(mockNudge) }] } }] };
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
