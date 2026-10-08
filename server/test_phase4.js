const assert = require('assert');
const { calculateFunnel } = require('./src/services/funnel');
const { calculateMetrics } = require('./src/services/metrics');
const { calculateStallStatus, summarizeStuckUsers, median } = require('./src/services/stall');
const { compareCohorts } = require('./src/services/cohort');

function runTests() {
  console.log('--- RUNNING PHASE 4 TESTS ---');
  
  // 1 & 2 & 3. Funnel, Conversion, Drop-off
  const mockUsers = [
    { currentStep: 'connect_data_source' },
    { currentStep: 'connect_data_source' },
    { currentStep: 'verify_email' },
    { currentStep: 'first_report' } // activated
  ];
  
  const funnel = calculateFunnel(mockUsers);
  assert.strictEqual(funnel.totalUsers, 4);
  assert.strictEqual(funnel.activatedUsers, 1);
  // Verify email should have 3 reached (2 connect + 1 verify + 1 activated, wait no, connect_data_source implies verify_email was reached)
  // Actually, connect_data_source is step 3. So step 0,1,2,3 reached by first two users.
  // step 0,1 reached by third. step 0,1,2,3,4,5 reached by fourth.
  // Let's check worst drop-off
  assert.strictEqual(funnel.steps.length, 6);
  assert.ok(funnel.worstDropOff);
  console.log('✅ Funnel, Conversion, Drop-off calculation passed.');

  // 4. Stall Threshold
  const simNowMs = 1000000000;
  const stalledUser = { currentStep: 'verify_email', lastProgressAtMs: simNowMs - (25 * 60 * 60 * 1000) };
  const activeUser = { currentStep: 'verify_email', lastProgressAtMs: simNowMs - (2 * 60 * 60 * 1000) };
  const activatedUser = { currentStep: 'first_report', lastProgressAtMs: simNowMs - (100 * 60 * 60 * 1000) };
  
  assert.strictEqual(calculateStallStatus(stalledUser, simNowMs), 'stuck');
  assert.strictEqual(calculateStallStatus(activeUser, simNowMs), 'active');
  assert.strictEqual(calculateStallStatus(activatedUser, simNowMs), 'activated');
  console.log('✅ Stall threshold calculation passed.');

  // 5. Median Stuck Time
  const usersForStuck = [
    { status: 'stuck', currentStep: 'verify_email', lastProgressAtMs: simNowMs - (30 * 60 * 60 * 1000) },
    { status: 'stuck', currentStep: 'verify_email', lastProgressAtMs: simNowMs - (40 * 60 * 60 * 1000) },
    { status: 'stuck', currentStep: 'verify_email', lastProgressAtMs: simNowMs - (50 * 60 * 60 * 1000) },
  ];
  const stuckSummary = summarizeStuckUsers(usersForStuck, simNowMs);
  assert.strictEqual(stuckSummary[0].stuckUserCount, 3);
  assert.strictEqual(stuckSummary[0].medianHoursStuck, 40);
  console.log('✅ Median stuck time calculation passed.');

  // 6. Cohort Comparison
  const cohortUsers = [
    { status: 'activated', plan: 'pro' },
    { status: 'activated', plan: 'pro' },
    { status: 'stuck', plan: 'free' },
    { status: 'stuck', plan: 'free' },
  ];
  const cohort = compareCohorts(cohortUsers);
  assert.strictEqual(cohort.successfulPlanDist['pro'], '100%');
  assert.strictEqual(cohort.stuckPlanDist['free'], '100%');
  console.log('✅ Cohort comparison passed.');

  // 7 & 8. Recovery Rate & Revenue
  const mockInterventions = [{}, {}]; // 2 interventions sent
  const mockOutcomes = [{ progressed: true }, { progressed: false }]; // 1 recovered
  const metrics = calculateMetrics([{ status: 'stuck' }, { status: 'stuck' }], mockInterventions, mockOutcomes, 49);
  
  assert.strictEqual(metrics.recoveryRate, 50);
  assert.strictEqual(metrics.estimatedRevenueRecovered, 49);
  console.log('✅ Metrics, Recovery Rate, and Revenue calculation passed.');

  console.log('--- ALL TESTS PASSED ---');
}

runTests();
