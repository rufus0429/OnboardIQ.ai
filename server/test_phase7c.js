const assert = require('assert');
const { InterventionUpdateSchema } = require('./src/validation/interventionSchemas');
const { calculateMetrics } = require('./src/services/metrics');

async function runTests() {
  console.log('--- RUNNING PHASE 7C TESTS ---');

  // 1. Validation includes fail states
  console.log('Testing Intervention State Extensions...');
  const { InterventionStateEnum } = require('./src/validation/interventionSchemas');
  assert.doesNotThrow(() => InterventionStateEnum.parse('validated'));
  assert.doesNotThrow(() => InterventionStateEnum.parse('failed'));

  // 2. Mock metrics output with autonomous states
  console.log('Testing Metrics handling of autonomous states...');
  const users = [{ status: 'stuck' }, { status: 'stuck' }, { status: 'stuck' }];
  // Interventions: 1 drafted, 2 sent autonomously, 1 failed
  const interventions = [{ status: 'sent' }, { status: 'sent' }, { status: 'drafted' }, { status: 'failed' }]; 
  const outcomes = [{ progressed: true }, { progressed: false }]; // 1 recovered
  
  const metrics = calculateMetrics(users, interventions, outcomes, 50);
  assert.strictEqual(metrics.stuckUsers, 3);
  assert.strictEqual(metrics.nudgesSent, 2); // only 'sent' counts
  assert.strictEqual(metrics.recoveredUsers, 1);
  assert.strictEqual(metrics.recoveryRate, 50); // 1 / 2 * 100

  console.log('--- ALL PHASE 7C TESTS PASSED ---');
}

runTests().catch(console.error);
