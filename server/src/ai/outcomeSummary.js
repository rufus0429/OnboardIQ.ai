const { ai } = require('./gemini');
const { OutcomeSummarySchema } = require('../validation/interventionSchemas');
const { env } = require('../config/env');

const systemPrompt = `You are OnboardIQ's recovery summarization agent.
Your job is to analyze aggregated outcome data after interventions were sent and summarize the results.
Answer three questions:
1. What worked?
2. What did not work?
3. What should we try next?
Rules:
- Use only supplied metrics.
- Never invent statistics.
- Never claim causality stronger than the simulator data supports.
- Clearly distinguish correlation from observed outcome.
- Recommend actionable next steps.
- If sample size is small, say so.
- Respond exactly in JSON with keys: headline (string), whatWorked (array of strings), whatDidNot (array of strings), nextActions (array of strings).`;

async function generateOutcomeSummary(outcomesData) {
  const reqConfig = {
    systemInstruction: systemPrompt,
    temperature: 0.2,
    responseMimeType: 'application/json'
  };
  
  const content = `Aggregated Outcomes: ${JSON.stringify(outcomesData)}`;
  
  try {
    let response;
    try {
      response = await ai.models.generateContent({
        model: env.GEMINI_MODEL || 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: content }] }],
        config: reqConfig
      });
    } catch (error) {
      console.warn('Gemini error, using mock OutcomeSummary:', error);
      const mockSummary = {
        headline: "Rate Limit Mock Summary",
        whatWorked: ["Mock work"],
        whatDidNot: ["Mock fail"],
        nextActions: ["Wait for quota"]
      };
      response = { candidates: [{ content: { parts: [{ text: JSON.stringify(mockSummary) }] } }] };
    }

    const textPart = response.candidates[0].content.parts.find(p => p.text);
    if (!textPart) throw new Error('No text returned');
    
    const jsonText = textPart.text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonText);
    return OutcomeSummarySchema.parse(parsed);
  } catch (error) {
    throw new Error('Failed to generate summary: ' + error.message);
  }
}

module.exports = { generateOutcomeSummary };
