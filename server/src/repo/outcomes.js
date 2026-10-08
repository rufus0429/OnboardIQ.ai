const { db } = require('../config/firebase');

async function getWorkspaceOutcomes(ownerUid, workspaceId) {
  const snap = await db.collection('outcomes')
    .where('ownerUid', '==', ownerUid)
    .where('workspaceId', '==', workspaceId)
    .get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

module.exports = { getWorkspaceOutcomes };
