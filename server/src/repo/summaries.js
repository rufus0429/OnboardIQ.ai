const { db } = require('../config/firebase');

async function saveOutcomeSummary(workspaceId, ownerUid, summaryData) {
  const docRef = db.collection('outcomeSummaries').doc();
  const summary = {
    id: docRef.id,
    workspaceId,
    ownerUid,
    ...summaryData,
    createdAtMs: Date.now()
  };
  await docRef.set(summary);
  return summary;
}

async function getLatestOutcomeSummary(ownerUid, workspaceId) {
  const snapshot = await db.collection('outcomeSummaries')
    .where('workspaceId', '==', workspaceId)
    .where('ownerUid', '==', ownerUid)
    .orderBy('createdAtMs', 'desc')
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return snapshot.docs[0].data();
}

module.exports = { saveOutcomeSummary, getLatestOutcomeSummary };
