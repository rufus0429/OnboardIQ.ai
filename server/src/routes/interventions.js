const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const { getWorkspaceInterventions, getIntervention, updateIntervention, bulkUpdateInterventions } = require('../repo/interventions');
const { InterventionUpdateSchema, BulkApproveSchema } = require('../validation/interventionSchemas');
const { sendInterventionEmail } = require('../services/email');
const { db } = require('../config/firebase');

const router = express.Router({ mergeParams: true });
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const interventions = await getWorkspaceInterventions(req.uid, req.params.workspaceId);
    res.json({ ok: true, data: interventions });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const intervention = await getIntervention(req.uid, req.params.workspaceId, req.params.id);
    if (!intervention) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Intervention not found' } });
    if (intervention.status !== 'drafted') return res.status(400).json({ ok: false, error: { code: 'INVALID_STATE', message: 'Only drafted interventions can be edited' } });

    const updates = InterventionUpdateSchema.parse(req.body);
    updates.editedByUser = true;

    await updateIntervention(req.params.id, updates);
    res.json({ ok: true, data: { ...intervention, ...updates } });
  } catch (error) {
    if (error.name === 'ZodError') return res.status(400).json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', issues: error.issues } });
    next(error);
  }
});

router.post('/:id/approve', async (req, res, next) => {
  try {
    const intervention = await getIntervention(req.uid, req.params.workspaceId, req.params.id);
    if (!intervention) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Intervention not found' } });
    if (intervention.status !== 'drafted') return res.status(400).json({ ok: false, error: { code: 'INVALID_STATE', message: 'Only drafted interventions can be approved' } });

    const updates = { status: 'approved', approvedAt: Date.now() };
    await updateIntervention(req.params.id, updates);
    
    // Fetch user for email
    const userDoc = await db.collection('endUsers').doc(intervention.endUserId).get();
    const userEmail = userDoc.exists && userDoc.data().email ? userDoc.data().email : `${intervention.endUserId}@example.com`;
    
    const sendResult = await sendInterventionEmail({ ...intervention, userEmail });
    if (sendResult.success) {
      await updateIntervention(req.params.id, { status: 'sent', sentAtMs: Date.now(), sendResult });
      updates.status = 'sent';
    }

    res.json({ ok: true, data: { ...intervention, ...updates } });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/reject', async (req, res, next) => {
  try {
    const intervention = await getIntervention(req.uid, req.params.workspaceId, req.params.id);
    if (!intervention) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Intervention not found' } });
    if (intervention.status !== 'drafted') return res.status(400).json({ ok: false, error: { code: 'INVALID_STATE', message: 'Only drafted interventions can be rejected' } });

    const updates = { status: 'rejected' };
    await updateIntervention(req.params.id, updates);
    res.json({ ok: true, data: { ...intervention, ...updates } });
  } catch (error) {
    next(error);
  }
});

router.post('/bulk-approve', async (req, res, next) => {
  try {
    const { ids } = BulkApproveSchema.parse(req.body);
    let approved = 0;
    let skipped = 0;
    
    // Validate each
    const validIds = [];
    for (const id of ids) {
      const inv = await getIntervention(req.uid, req.params.workspaceId, id);
      if (inv && inv.status === 'drafted') {
        validIds.push(inv);
      } else {
        skipped++;
      }
    }
    
    if (validIds.length > 0) {
      await bulkUpdateInterventions(validIds.map(v => v.id), { status: 'approved', approvedAt: Date.now() });
      approved = validIds.length;
      
      let sentCount = 0;
      let failedCount = 0;

      for (const inv of validIds) {
        const userDoc = await db.collection('endUsers').doc(inv.endUserId).get();
        const userEmail = userDoc.exists && userDoc.data().email ? userDoc.data().email : `${inv.endUserId}@example.com`;
        
        const sendResult = await sendInterventionEmail({ ...inv, userEmail });
        if (sendResult.success) {
           await updateIntervention(inv.id, { status: 'sent', sentAtMs: Date.now(), sendResult });
           sentCount++;
        } else {
           failedCount++;
        }
      }
      
      res.json({ ok: true, data: { requested: ids.length, approved, skipped, sent: sentCount, failed: failedCount } });
      return;
    }

    res.json({ ok: true, data: { requested: ids.length, approved, skipped, sent: 0, failed: 0 } });
  } catch (error) {
    if (error.name === 'ZodError') return res.status(400).json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', issues: error.issues } });
    next(error);
  }
});

module.exports = router;
