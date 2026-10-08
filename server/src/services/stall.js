const { STEPS } = require('../utils/constants');

function median(values) {
  if (values.length === 0) return 0;
  values.sort((a, b) => a - b);
  const half = Math.floor(values.length / 2);
  if (values.length % 2) return values[half];
  return (values[half - 1] + values[half]) / 2.0;
}

function calculateStallStatus(user, simNowMs, stallThresholdHours = 24) {
  if (user.currentStep === STEPS[STEPS.length - 1]) return 'activated';
  
  const timeSinceProgressMs = simNowMs - user.lastProgressAtMs;
  const stallThresholdMs = stallThresholdHours * 60 * 60 * 1000;

  if (timeSinceProgressMs >= stallThresholdMs) {
    return 'stuck';
  }
  return 'active';
}

function summarizeStuckUsers(users, simNowMs) {
  const stuckUsers = users.filter(u => u.status === 'stuck');
  const totalUsers = users.length;
  
  const stepMap = {};
  
  stuckUsers.forEach(u => {
    const step = u.currentStep;
    if (!stepMap[step]) stepMap[step] = { count: 0, times: [], errorRate: 0, helpOpenRate: 0 }; // simplified
    
    stepMap[step].count++;
    stepMap[step].times.push((simNowMs - u.lastProgressAtMs) / (60 * 60 * 1000));
    // For noise, let's randomly assign some fake error rate in real implementation or derive it.
    // For pure logic test, we'll keep it 0 unless provided.
  });

  const result = Object.keys(stepMap).map(step => {
    const data = stepMap[step];
    const avg = data.times.reduce((a, b) => a + b, 0) / data.count;
    
    return {
      step,
      stuckUserCount: data.count,
      percentageOfTotal: Math.round((data.count / totalUsers) * 100) || 0,
      medianHoursStuck: Math.round(median(data.times) * 10) / 10,
      averageHoursStuck: Math.round(avg * 10) / 10,
      errorRate: 0.15, // placeholder
      helpOpenRate: 0.05 // placeholder
    };
  });
  
  return result.sort((a, b) => b.stuckUserCount - a.stuckUserCount);
}

module.exports = { calculateStallStatus, summarizeStuckUsers, median };
