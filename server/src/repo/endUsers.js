const { db } = require('../config/firebase');

async function getWorkspaceUsers(ownerUid, workspaceId) {
  const snapshot = await db.collection('endUsers')
    .where('ownerUid', '==', ownerUid)
    .where('workspaceId', '==', workspaceId)
    .get();
    
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getUserJourney(ownerUid, workspaceId, endUserId) {
  const userDoc = await db.collection('endUsers').doc(endUserId).get();
  if (!userDoc.exists) return null;
  
  const userData = userDoc.data();
  if (userData.ownerUid !== ownerUid || userData.workspaceId !== workspaceId) return null;

  const eventsSnap = await db.collection('events')
    .where('ownerUid', '==', ownerUid)
    .where('workspaceId', '==', workspaceId)
    .where('endUserId', '==', endUserId)
    .orderBy('tsMs', 'asc')
    .get();

  const events = eventsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Exclude hiddenPersona
  const { hiddenPersona, ...safeUserData } = userData;
  
  return {
    user: safeUserData,
    events
  };
}

module.exports = { getWorkspaceUsers, getUserJourney };
