const assert = require('assert');
const { InterventionUpdateSchema, BulkApproveSchema, OutcomeSummarySchema } = require('./src/validation/interventionSchemas');
const { calculateMetrics } = require('./src/services/metrics');
const { sendInterventionEmail } = require('./src/services/email');

async function runTests() {
  console.log('--- RUNNING PHASE 6 TESTS ---');

  // 1. Intervention Validation
  console.log('Testing Intervention Updates...');
  const validUpdate = InterventionUpdateSchema.parse({
    subject: 'New Subject',
    tone: 'concise',
    body: 'Just a short sentence.' // way under 120 words
  });
  assert.strictEqual(validUpdate.tone, 'concise');
  
  const longBody = Array(125).fill('word').join(' ');
  assert.throws(() => InterventionUpdateSchema.parse({ body: longBody }));

  // 2. Bulk Approval limits
  console.log('Testing Bulk Approval limits...');
  const lotsOfIds = Array(51).fill('id');
  assert.throws(() => BulkApproveSchema.parse({ ids: lotsOfIds }));

  // 3. Mock Send
  console.log('Testing Mock Send...');
  const sendRes = await sendInterventionEmail({ id: 'mock' });
  assert.strictEqual(sendRes.provider, 'mock');
  assert.strictEqual(sendRes.success, true);

  // 4. Metrics with Outcomes
  console.log('Testing Recovery Metrics...');
  const users = [{ status: 'stuck' }, { status: 'stuck' }, { status: 'stuck' }];
  const interventions = [{ status: 'sent' }, { status: 'sent' }, { status: 'drafted' }]; // 2 eligible sent
  const outcomes = [{ progressed: true }, { progressed: false }]; // 1 recovered
  
  const metrics = calculateMetrics(users, interventions, outcomes, 50);
  assert.strictEqual(metrics.stuckUsers, 3);
  assert.strictEqual(metrics.nudgesSent, 2);
  assert.strictEqual(metrics.recoveredUsers, 1);
  assert.strictEqual(metrics.recoveryRate, 50); // 1 / 2 * 100
  assert.strictEqual(metrics.estimatedRevenueRecovered, 50);

  // 5. Zero users edge case
  const zeroMetrics = calculateMetrics([], [], [], 50);
  assert.strictEqual(zeroMetrics.recoveryRate, 0);

  // 6. Outcome Summary Schema
  console.log('Testing Outcome Summary Schema...');
  const validSummary = OutcomeSummarySchema.parse({
    headline: 'Improved 20%',
    whatWorked: ['Nudges'],
    whatDidNot: ['Emails'],
    nextActions: ['Try SMS']
  });
  assert.strictEqual(validSummary.whatWorked.length, 1);

  console.log('--- ALL PHASE 6 TESTS PASSED ---');
}

runTests().catch(console.error);
