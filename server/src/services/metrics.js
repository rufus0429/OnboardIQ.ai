function calculateMetrics(users, interventions = [], outcomes = [], avgRevenuePerUser = 49) {
  const totalUsers = users.length;
  let stuckUsers = 0;
  let recoveredUsers = 0;

  users.forEach(u => {
    if (u.status === 'stuck') stuckUsers++;
  });

  outcomes.forEach(o => {
    if (o.progressed) recoveredUsers++;
  });

  // Eligible nudged users
  const sentInterventions = interventions.filter(i => i.status === 'sent' || i.status === 'simulated');
  const recoveryRate = sentInterventions.length === 0 ? 0 : recoveredUsers / sentInterventions.length;
  const estimatedRevenueRecovered = recoveredUsers * avgRevenuePerUser;

  return {
    totalUsers,
    stuckUsers,
    recoveredUsers,
    recoveryRate: Math.round(recoveryRate * 100),
    estimatedRevenueRecovered,
    nudgesSent: sentInterventions.length
  };
}

module.exports = { calculateMetrics };
