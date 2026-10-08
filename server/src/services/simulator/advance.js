const { db } = require('../../config/firebase');
const { getWorkspace, executeBatch } = require('../../repo/workspaces');
const { STEPS } = require('../../utils/constants');
const { mulberry32 } = require('../../utils/rng');

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

  const prng = mulberry32(newSimNowMs);

  // 2. Get all stuck users
  const stuckUsersSnap = await db.collection('endUsers')
    .where('ownerUid', '==', ownerUid)
    .where('workspaceId', '==', workspaceId)
    .where('status', '==', 'stuck')
    .get();

  // 3. Get all active interventions
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
  
  const activeInterventionsByUserId = {};
  interventionsSnap.docs.forEach(doc => {
    if (!resolvedInterventionIds.has(doc.id)) {
      activeInterventionsByUserId[doc.data().endUserId] = { id: doc.id, ...doc.data() };
    }
  });

  // 4. Process each stuck user
  stuckUsersSnap.docs.forEach(userDoc => {
    const user = userDoc.data();
    const userId = userDoc.id;
    const intervention = activeInterventionsByUserId[userId];

    // Evaluate progression
    const isNudged = !!intervention;
    const prob = isNudged ? 0.60 : 0.10;
    const progressed = prng() < prob;

    if (progressed) {
      const currentStepIdx = STEPS.indexOf(user.currentStep);
      if (currentStepIdx > -1 && currentStepIdx < STEPS.length - 1) {
        const nextStep = STEPS[currentStepIdx + 1];
        const isActivated = nextStep === STEPS[STEPS.length - 1];
        
        const eventId = db.collection('events').doc().id;
        batchOps.push({
          type: 'set',
          ref: db.collection('events').doc(eventId),
          data: {
            id: eventId,
            ownerUid,
            workspaceId,
            endUserId: userId,
            step: nextStep,
            tsMs: newSimNowMs
          }
        });

        batchOps.push({
          type: 'update',
          ref: db.collection('endUsers').doc(userId),
          data: {
            currentStep: nextStep,
            status: isActivated ? 'activated' : 'in_progress', // Temporarily back to in_progress or activated
            lastProgressAtMs: newSimNowMs
          }
        });

        // Record causal outcome
        const outcomeId = db.collection('outcomes').doc().id;
        const outcomeData = {
          id: outcomeId,
          ownerUid,
          workspaceId,
          interventionId: isNudged ? intervention.id : null,
          isControlGroup: !isNudged,
          endUserId: userId,
          stalledStep: isNudged ? intervention.stalledStep : user.currentStep,
          progressed: true,
          recoveredAt: newSimNowMs,
          recoveryEvent: nextStep,
          resolvedAtMs: newSimNowMs
        };
        
        if (isNudged) {
          outcomeData.timeToRecovery = newSimNowMs - intervention.sentAtMs;
        }

        batchOps.push({
          type: 'set',
          ref: db.collection('outcomes').doc(outcomeId),
          data: outcomeData
        });
      }
    } else if (isNudged) {
      // If they were nudged but didn't progress in this tick, wait or mark failed?
      // Simulator usually gives them 1 tick (or maybe wait longer). Let's say if time since sent > 48h, mark as failed.
      if (newSimNowMs - intervention.sentAtMs > 48 * 3600000) {
        const outcomeId = db.collection('outcomes').doc().id;
        batchOps.push({
          type: 'set',
          ref: db.collection('outcomes').doc(outcomeId),
          data: {
            id: outcomeId,
            ownerUid,
            workspaceId,
            interventionId: intervention.id,
            endUserId: userId,
            stalledStep: intervention.stalledStep,
            progressed: false,
            resolvedAtMs: newSimNowMs
          }
        });
      }
    }
  });

  await executeBatch(batchOps);
  
  const { runAutonomousRecovery } = require('../autonomousRecovery');
  const recoveryStats = await runAutonomousRecovery(ownerUid, workspaceId, newSimNowMs);
  
  return { simNowMs: newSimNowMs, recoveryStats };
}

module.exports = { advanceTime };
