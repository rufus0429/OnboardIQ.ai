const { db } = require('../config/firebase');

async function saveDiagnosis(workspaceId, ownerUid, diagnosisData) {
  const docRef = db.collection('diagnoses').doc();
  const diagnosis = {
    id: docRef.id,
    workspaceId,
    ownerUid,
    ...diagnosisData,
    createdAtMs: Date.now()
  };
  await docRef.set(diagnosis);
  return diagnosis;
}

async function getLatestDiagnosis(ownerUid, workspaceId) {
  const snapshot = await db.collection('diagnoses')
    .where('workspaceId', '==', workspaceId)
    .where('ownerUid', '==', ownerUid)
    .orderBy('createdAtMs', 'desc')
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return snapshot.docs[0].data();
}

module.exports = { saveDiagnosis, getLatestDiagnosis };
