const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const { db } = require('../config/firebase');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const snapshot = await db.collection('workspaces').where('ownerUid', '==', req.uid).get();
    const workspaces = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ ok: true, data: workspaces });
  } catch (error) {
    next(error);
  }
});

// Create default workspace (for testing since Phase 2 mentioned it)
router.post('/default', async (req, res, next) => {
  try {
    const wsRef = db.collection('workspaces').doc();
    const wsData = {
      ownerUid: req.uid,
      name: 'Demo SaaS',
      createdAt: Date.now()
    };
    await wsRef.set(wsData);
    res.json({ ok: true, data: { id: wsRef.id, ...wsData } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
