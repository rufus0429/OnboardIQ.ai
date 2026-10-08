const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const { getWorkspaceOutcomes } = require('../repo/outcomes');
const { generateOutcomeSummary } = require('../ai/outcomeSummary');
const { getWorkspaceInterventions } = require('../repo/interventions');
const { calculateMetrics } = require('../services/metrics');
const { getWorkspaceUsers } = require('../repo/endUsers');

const router = express.Router({ mergeParams: true });
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const outcomes = await getWorkspaceOutcomes(req.uid, req.params.workspaceId);
    res.json({ ok: true, data: outcomes });
  } catch (error) {
    next(error);
  }
});

router.post('/summarize', async (req, res, next) => {
  try {
    const outcomes = await getWorkspaceOutcomes(req.uid, req.params.workspaceId);
    const interventions = await getWorkspaceInterventions(req.uid, req.params.workspaceId);
    const users = await getWorkspaceUsers(req.uid, req.params.workspaceId);
    
    const metrics = calculateMetrics(users, interventions, outcomes, 49);
    
    // Pass minimal data to AI to prevent context overload
    const aiData = {
      totalUsers: metrics.totalUsers,
      stuckUsers: metrics.stuckUsers,
      nudgesSent: metrics.nudgesSent,
      recoveredUsers: metrics.recoveredUsers,
      recoveryRate: metrics.recoveryRate,
      estimatedRevenueRecovered: metrics.estimatedRevenueRecovered
    };

    const summary = await generateOutcomeSummary(aiData);
    res.json({ ok: true, data: summary });
  } catch (error) {
    next(error);
  }
});

router.get('/latest-summary', async (req, res, next) => {
  // If we persisted the AI summary, we'd fetch it here.
  // For the hackathon, we can return empty or trigger the generation if not saved.
  res.json({ ok: true, data: null });
});

module.exports = router;
