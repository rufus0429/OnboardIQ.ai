const { db } = require('../config/firebase');

const getWorkspaceRef = (ownerUid, workspaceId) => {
  return db.collection('workspaces').doc(workspaceId);
};

const getWorkspace = async (ownerUid, workspaceId) => {
  const doc = await getWorkspaceRef(ownerUid, workspaceId).get();
  if (!doc.exists) return null;
  const data = doc.data();
  if (data.ownerUid !== ownerUid) return null; // Security check
  return { id: doc.id, ...data };
};

const updateWorkspace = async (ownerUid, workspaceId, updates) => {
  const ws = await getWorkspace(ownerUid, workspaceId);
  if (!ws) throw new Error('Workspace not found or access denied');
  await getWorkspaceRef(ownerUid, workspaceId).update(updates);
  return { ...ws, ...updates };
};

// Batch write helper (max 500 ops)
const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

const executeBatch = async (operations) => {
  const chunks = chunkArray(operations, 450); // Safe limit under 500
  let totalWritten = 0;
  
  for (const chunk of chunks) {
    const batch = db.batch();
    for (const op of chunk) {
      if (op.type === 'set') batch.set(op.ref, op.data, { merge: op.merge });
      else if (op.type === 'update') batch.update(op.ref, op.data);
      else if (op.type === 'delete') batch.delete(op.ref);
    }
    await batch.commit();
    totalWritten += chunk.length;
  }
  return totalWritten;
};

module.exports = {
  getWorkspace,
  updateWorkspace,
  getWorkspaceRef,
  executeBatch,
};
