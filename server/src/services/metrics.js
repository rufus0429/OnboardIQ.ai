function calculateMetrics(users, interventions = [], outcomes = [], avgRevenuePerUser = 49) {
  const totalUsers = users.length;
  let nudgedRecovered = 0;
  let unnudgedRecovered = 0;

  outcomes.forEach(o => {
    if (o.progressed) {
      if (o.interventionId) nudgedRecovered++;
      else unnudgedRecovered++;
    }
  });

  const sentInterventions = interventions.filter(i => i.status === 'sent' || i.status === 'simulated');
  const nudgedTotal = sentInterventions.length;
  
  // unnudged stuck users are those who are currently stuck and have no intervention, PLUS those who already recovered.
  let unnudgedStuckCurrent = 0;
  users.forEach(u => {
    if (u.status === 'stuck') {
      stuckUsers++;
      if (!sentInterventions.find(i => i.endUserId === u.id)) {
        unnudgedStuckCurrent++;
      }
    }
  });

  const unnudgedTotal = unnudgedStuckCurrent + unnudgedRecovered;

  const nudgedRate = nudgedTotal > 0 ? nudgedRecovered / nudgedTotal : 0;
  const unnudgedRate = unnudgedTotal > 0 ? unnudgedRecovered / unnudgedTotal : 0;

  const estimatedRevenueRecovered = nudgedRecovered * avgRevenuePerUser;

  return {
    totalUsers,
    stuckUsers,
    recoveredUsers: nudgedRecovered + unnudgedRecovered,
    recoveryRate: Math.round(nudgedRate * 100),
    estimatedRevenueRecovered,
    nudgesSent: nudgedTotal,
    controlGroup: {
      nudged: { recovered: nudgedRecovered, total: nudgedTotal, rate: Math.round(nudgedRate * 100) },
      unnudged: { recovered: unnudgedRecovered, total: unnudgedTotal, rate: Math.round(unnudgedRate * 100) }
    }
  };
}

module.exports = { calculateMetrics };
