const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const { seedSimulator, clearWorkspaceData } = require('../services/simulator/generator');
const { advanceTime } = require('../services/simulator/advance');
const { SeedSchema, AdvanceSchema } = require('../validation/schemas');

const router = express.Router({ mergeParams: true });
router.use(requireAuth);

// Check workspace existence basic wrapper
router.use(async (req, res, next) => {
  const { workspaceId } = req.params;
  const { db } = require('../config/firebase');
  const wsDoc = await db.collection('workspaces').doc(workspaceId).get();
  if (!wsDoc.exists || wsDoc.data().ownerUid !== req.uid) {
    return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Workspace not found' } });
  }
  next();
});

router.post('/seed', async (req, res, next) => {
  try {
    const config = SeedSchema.parse(req.body || {});
    const result = await seedSimulator(req.uid, req.params.workspaceId, config);
    res.json({ ok: true, data: result });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ ok: false, error: { code: 'VALIDATION_ERROR', message: error.errors } });
    }
    next(error);
  }
});

router.post('/reset', async (req, res, next) => {
  try {
    await clearWorkspaceData(req.uid, req.params.workspaceId);
    res.json({ ok: true, data: { success: true } });
  } catch (error) {
    next(error);
  }
});

router.post('/advance', async (req, res, next) => {
  try {
    const data = AdvanceSchema.parse(req.body);
    const result = await advanceTime(req.uid, req.params.workspaceId, data.hours);
    res.json({ ok: true, data: result });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ ok: false, error: { code: 'VALIDATION_ERROR', message: error.errors } });
    }
    next(error);
  }
});

module.exports = router;
