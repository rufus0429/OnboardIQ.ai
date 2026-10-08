const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const { getWorkspaceOutcomes } = require('../repo/outcomes');
const { generateOutcomeSummary } = require('../ai/outcomeSummary');
const { getWorkspaceInterventions } = require('../repo/interventions');
const { calculateMetrics } = require('../services/metrics');
const { getWorkspaceUsers } = require('../repo/endUsers');
const { saveOutcomeSummary, getLatestOutcomeSummary } = require('../repo/summaries');

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
    await saveOutcomeSummary(req.params.workspaceId, req.uid, summary);
    res.json({ ok: true, data: summary });
  } catch (error) {
    next(error);
  }
});

router.get('/latest-summary', async (req, res, next) => {
  try {
    const summary = await getLatestOutcomeSummary(req.uid, req.params.workspaceId);
    if (!summary) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'No summary found' } });
    res.json({ ok: true, data: summary });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
