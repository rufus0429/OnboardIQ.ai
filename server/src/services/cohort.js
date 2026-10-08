const { STEPS } = require('../utils/constants');

function compareCohorts(users) {
  const successful = users.filter(u => u.status === 'activated');
  const stuck = users.filter(u => u.status === 'stuck');

  if (successful.length === 0 || stuck.length === 0) return null;

  // Let's compare plan distribution
  const countPlans = (cohort) => cohort.reduce((acc, u) => {
    acc[u.plan] = (acc[u.plan] || 0) + 1;
    return acc;
  }, {});

  const succPlans = countPlans(successful);
  const stuckPlans = countPlans(stuck);

  const formatDist = (counts, total) => {
    return Object.keys(counts).reduce((acc, key) => {
      acc[key] = Math.round((counts[key] / total) * 100) + '%';
      return acc;
    }, {});
  };

  return {
    successfulCount: successful.length,
    stuckCount: stuck.length,
    successfulPlanDist: formatDist(succPlans, successful.length),
    stuckPlanDist: formatDist(stuckPlans, stuck.length),
    // Example step conversion based on the worst drop-off step (this will be wired in real service)
  };
}

module.exports = { compareCohorts };
