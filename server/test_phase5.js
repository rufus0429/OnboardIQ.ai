const assert = require('assert');
const { tools } = require('./src/ai/tools');
const { DiagnosisResultSchema, NudgeSchema } = require('./src/validation/aiSchemas');
const { runAgentAnalysis } = require('./src/ai/agent');
const { ai } = require('./src/ai/gemini');

async function runTests() {
  console.log('--- RUNNING PHASE 5 TESTS ---');

  // 1. Tool argument validation via schemas
  console.log('Testing Nudge Validation...');
  assert.throws(() => NudgeSchema.parse({
    endUserId: '123'
    // Missing required fields
  }));
  
  const validNudge = NudgeSchema.parse({
    endUserId: '123',
    channel: 'email',
    tone: 'friendly',
    subject: 'Need help?',
    body: 'Hi there'
  });
  assert.strictEqual(validNudge.tone, 'friendly');
  
  // 2. Word-count constraint in save_nudge_draft
  console.log('Testing word-count constraint...');
  const longBody = Array(125).fill('word').join(' ');
  try {
    await tools.save_nudge_draft.execute({ ...validNudge, body: longBody, diagnosisId: 'd1' }, { ownerUid: 'u1', workspaceId: 'w1' });
    assert.fail('Should have thrown word count error');
  } catch (e) {
    assert.ok(e.message.includes('120 words'));
  }

  // 3. Diagnosis Schema Validation (>= 3 evidence items)
  console.log('Testing Diagnosis Validation...');
  assert.throws(() => DiagnosisResultSchema.parse({
    step: 'connect_data_source',
    stallCause: 'technical_friction',
    hypothesis: 'API is down',
    proposedFix: 'Fix API',
    confidence: 'high',
    affectedUserCount: 10,
    evidence: [{ fact: '1', value: '1', source: 'tool' }] // only 1 item
  }));

  const validDiagnosis = DiagnosisResultSchema.parse({
    step: 'connect_data_source',
    stallCause: 'technical_friction',
    hypothesis: 'API is down',
    proposedFix: 'Fix API',
    confidence: 'high',
    affectedUserCount: 10,
    evidence: [
      { fact: '1', value: '1', source: 'tool' },
      { fact: '2', value: '2', source: 'tool' },
      { fact: '3', value: '3', source: 'tool' }
    ]
  });
  assert.strictEqual(validDiagnosis.evidence.length, 3);

  // 4. Agent Tool-loop iteration limit & Malformed output handling
  console.log('Testing Agent max iterations...');
  // Mock AI returning garbage
  ai.models = {
    generateContent: async () => ({
      candidates: [{
        content: { parts: [{ text: 'random garbage not json' }] }
      }]
    })
  };
  
  try {
    await runAgentAnalysis({ ownerUid: 'u1', workspaceId: 'w1' });
    assert.fail('Should have thrown max iterations error or json parse error');
  } catch (err) {
    assert.ok(err.message.includes('valid structured output') || err.message.includes('iterations'));
  }

  console.log('--- ALL PHASE 5 TESTS PASSED ---');
}

runTests().catch(console.error);
