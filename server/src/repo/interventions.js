const { db } = require('../config/firebase');

async function getWorkspaceInterventions(ownerUid, workspaceId) {
  const snap = await db.collection('interventions')
    .where('ownerUid', '==', ownerUid)
    .where('workspaceId', '==', workspaceId)
    .get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getIntervention(ownerUid, workspaceId, id) {
  const doc = await db.collection('interventions').doc(id).get();
  if (!doc.exists) return null;
  const data = doc.data();
  if (data.ownerUid !== ownerUid || data.workspaceId !== workspaceId) return null;
  return { id: doc.id, ...data };
}

async function updateIntervention(id, updates) {
  await db.collection('interventions').doc(id).update(updates);
}

// Bulk update using batched writes
async function bulkUpdateInterventions(ids, updates) {
  const batches = [];
  let currentBatch = db.batch();
  let count = 0;

  for (const id of ids) {
    const ref = db.collection('interventions').doc(id);
    currentBatch.update(ref, updates);
    count++;
    
    if (count === 450) {
      batches.push(currentBatch);
      currentBatch = db.batch();
      count = 0;
    }
  }

  if (count > 0) batches.push(currentBatch);
  for (const batch of batches) {
    await batch.commit();
  }
}

module.exports = {
  getWorkspaceInterventions,
  getIntervention,
  updateIntervention,
  bulkUpdateInterventions
};
