const { STEPS } = require('../utils/constants');

function calculateFunnel(users) {
  const totalUsers = users.length;
  if (totalUsers === 0) return { totalUsers: 0, steps: [], worstDropOff: null };

  const stepCounts = {};
  STEPS.forEach(s => stepCounts[s] = 0);

  // Users reaching a step (if they are at a later step, they reached earlier steps)
  users.forEach(u => {
    const currentIndex = STEPS.indexOf(u.currentStep);
    for (let i = 0; i <= currentIndex; i++) {
      if (STEPS[i]) stepCounts[STEPS[i]]++;
    }
  });

  const stepsResult = [];
  let worstDropOff = null;
  let maxDropRate = -1;

  for (let i = 0; i < STEPS.length; i++) {
    const step = STEPS[i];
    const reached = stepCounts[step];
    const previousReached = i === 0 ? totalUsers : stepCounts[STEPS[i - 1]];
    
    const conversion = previousReached === 0 ? 0 : reached / previousReached;
    const dropOff = 1 - conversion;

    stepsResult.push({
      step,
      usersReached: reached,
      conversionPercentage: Math.round(conversion * 100),
      dropOffPercentage: Math.round(dropOff * 100)
    });

    if (i > 0 && dropOff > maxDropRate) {
      maxDropRate = dropOff;
      worstDropOff = step;
    }
  }

  return {
    totalUsers,
    steps: stepsResult,
    worstDropOff: worstDropOff || STEPS[1],
    activatedUsers: stepCounts['first_report'] || 0
  };
}

module.exports = { calculateFunnel };
