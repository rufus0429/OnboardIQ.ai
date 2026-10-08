const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const { getWorkspaceUsers, getUserJourney } = require('../repo/endUsers');
const { calculateFunnel } = require('../services/funnel');
const { calculateMetrics } = require('../services/metrics');
const { summarizeStuckUsers } = require('../services/stall');
const { getWorkspace } = require('../repo/workspaces');

const router = express.Router({ mergeParams: true });
router.use(requireAuth);

const { z } = require('zod');

const ParamsSchema = z.object({
  workspaceId: z.string().min(1),
  endUserId: z.string().optional()
});

router.use(async (req, res, next) => {
  try {
    const { workspaceId } = ParamsSchema.parse(req.params);
    const ws = await getWorkspace(req.uid, workspaceId);
    if (!ws) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Workspace not found' } });
    req.workspace = ws; // Cache it for routes
    next();
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ ok: false, error: { code: 'VALIDATION_ERROR', message: err.errors } });
    next(err);
  }
});

router.get('/funnel', async (req, res, next) => {
  try {
    const users = await getWorkspaceUsers(req.uid, req.params.workspaceId);
    const funnel = calculateFunnel(users);
    res.json({ ok: true, data: funnel });
  } catch (error) {
    next(error);
  }
});

router.get('/metrics', async (req, res, next) => {
  try {
    const users = await getWorkspaceUsers(req.uid, req.params.workspaceId);
    
    // Import repo functions locally if not imported at top
    const { getWorkspaceInterventions } = require('../repo/interventions');
    const { getWorkspaceOutcomes } = require('../repo/outcomes');
    
    const interventions = await getWorkspaceInterventions(req.uid, req.params.workspaceId);
    const outcomes = await getWorkspaceOutcomes(req.uid, req.params.workspaceId);
    
    const metrics = calculateMetrics(users, interventions, outcomes);
    res.json({ ok: true, data: metrics });
  } catch (error) {
    next(error);
  }
});

router.get('/stuck-users', async (req, res, next) => {
  try {
    const users = await getWorkspaceUsers(req.uid, req.params.workspaceId);
    const summary = summarizeStuckUsers(users, req.workspace.simNowMs || Date.now());
    res.json({ ok: true, data: summary });
  } catch (error) {
    next(error);
  }
});

router.get('/users', async (req, res, next) => {
  try {
    const users = await getWorkspaceUsers(req.uid, req.params.workspaceId);
    const safeUsers = users.map(u => {
      const { hiddenPersona, ...safe } = u;
      return safe;
    });
    res.json({ ok: true, data: safeUsers });
  } catch (error) {
    next(error);
  }
});

router.get('/users/:endUserId/journey', async (req, res, next) => {
  try {
    const journey = await getUserJourney(req.uid, req.params.workspaceId, req.params.endUserId);
    if (!journey) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    res.json({ ok: true, data: journey });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
