const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const { runAgentAnalysis } = require('../ai/agent');
const rateLimit = require('express-rate-limit');
const { getWorkspace } = require('../repo/workspaces');

const router = express.Router({ mergeParams: true });

// AI Rate Limiter: 6 requests/minute/user
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 6,
  message: { ok: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many analysis requests' } },
  keyGenerator: (req) => req.uid
});

router.use(requireAuth);
router.use(aiLimiter);

router.post('/', async (req, res, next) => {
  try {
    const ws = await getWorkspace(req.uid, req.params.workspaceId);
    if (!ws) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Workspace not found' } });
    
    // Setup Context
    const ctx = {
      ownerUid: req.uid,
      workspaceId: req.params.workspaceId,
      simNowMs: ws.simNowMs || Date.now(),
      maxNudges: ws.settings?.maxNudgesPerRun || 25
    };

    const result = await runAgentAnalysis(ctx);
    
    res.json({
      ok: true,
      data: {
        diagnosis: result.diagnosis,
        nudgesDrafted: result.diagnosis?.nudgesDrafted || 0,
        agentTrace: result.agentTrace
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
