const { db } = require('../../config/firebase');
const { getWorkspace, executeBatch } = require('../../repo/workspaces');

async function advanceTime(ownerUid, workspaceId, hours) {
  const ws = await getWorkspace(ownerUid, workspaceId);
  if (!ws) throw new Error('Workspace not found');

  const advanceMs = hours * 60 * 60 * 1000;
  const newSimNowMs = (ws.simNowMs || Date.now()) + advanceMs;

  const batchOps = [];
  
  // 1. Update Workspace time
  batchOps.push({
    type: 'update',
    ref: db.collection('workspaces').doc(workspaceId),
    data: { simNowMs: newSimNowMs }
  });

  // Fast-forward intervention logic
  const interventionsSnap = await db.collection('interventions')
    .where('ownerUid', '==', ownerUid)
    .where('workspaceId', '==', workspaceId)
    .where('status', 'in', ['sent', 'simulated'])
    .get();
    
  const outcomesSnap = await db.collection('outcomes')
    .where('ownerUid', '==', ownerUid)
    .where('workspaceId', '==', workspaceId)
    .get();
    
  const resolvedInterventionIds = new Set(outcomesSnap.docs.map(doc => doc.data().interventionId));
  
  // Need users to check hiddenPersona
  const usersSnap = await db.collection('endUsers')
    .where('ownerUid', '==', ownerUid)
    .where('workspaceId', '==', workspaceId)
    .get();
  
  const usersMap = {};
  usersSnap.docs.forEach(doc => {
    usersMap[doc.id] = doc.data();
  });

  const generateId = () => Math.random().toString(36).substr(2, 9);
  
  interventionsSnap.docs.forEach(doc => {
    if (resolvedInterventionIds.has(doc.id)) return; // Already resolved
    
    const intervention = doc.data();
    const user = usersMap[intervention.endUserId];
    if (!user) return; // User deleted?
    
    // Evaluate outcome based on hiddenPersona
    let progressed = false;
    const persona = user.hiddenPersona;
    
    if (persona === 'will_progress_if_nudged' || persona === 'will_progress_anyway') {
      // Arbitrary high probability for simulation
      progressed = Math.random() < 0.95;
    } else if (persona === 'will_never_progress') {
      progressed = false;
    }
    
    const outcomeId = generateId();
    batchOps.push({
      type: 'set',
      ref: db.collection('outcomes').doc(outcomeId),
      data: {
        ownerUid,
        workspaceId,
        interventionId: doc.id,
        endUserId: intervention.endUserId,
        progressed,
        stepReached: progressed ? 'first_report' : user.currentStep,
        hoursToProgress: progressed ? 24 : 0,
        resolvedAtMs: newSimNowMs
      }
    });
    
    if (progressed) {
      batchOps.push({
        type: 'update',
        ref: db.collection('endUsers').doc(intervention.endUserId),
        data: {
          currentStep: 'first_report',
          status: 'activated',
          lastProgressAtMs: newSimNowMs
        }
      });
    }
  });

  await executeBatch(batchOps);
  
  const { runAutonomousRecovery } = require('../autonomousRecovery');
  const recoveryStats = await runAutonomousRecovery(ownerUid, workspaceId, newSimNowMs);
  
  return { simNowMs: newSimNowMs, recoveryStats };
}

module.exports = { advanceTime };
