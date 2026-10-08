const { db } = require('../config/firebase');
const { analyzeCohortBehavior } = require('./cohort');

const { generateIntervention } = require('../ai/agent');
const { sendInterventionEmail } = require('./email');
const { getWorkspace } = require('../repo/workspaces');

async function runAutonomousRecovery(ownerUid, workspaceId, simNowMs) {
  const ws = await getWorkspace(ownerUid, workspaceId);
  const stallThresholdHours = ws?.settings?.stallThresholdHours || 48;
  const maxNudges = ws?.settings?.maxNudgesPerRun || 1;
  const stallMs = stallThresholdHours * 3600000;

  // 1. Detect stuck users
  const usersSnap = await db.collection('endUsers')
    .where('ownerUid', '==', ownerUid)
    .where('workspaceId', '==', workspaceId)
    .where('status', '==', 'stuck')
    .get();
  const stuckUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const stats = {
    detected: stuckUsers.length,
    investigated: 0,
    eligible: 0,
    skipped: 0,
    generated: 0,
    sent: 0,
    failed: 0
  };

  if (stuckUsers.length === 0) return stats;

  // 2. Fetch existing interventions to prevent duplicates
  const existingInterventionsSnap = await db.collection('interventions')
    .where('ownerUid', '==', ownerUid)
    .where('workspaceId', '==', workspaceId)
    .get();
    
  const existingMap = {};
  existingInterventionsSnap.docs.forEach(doc => {
    const data = doc.data();
    if (!existingMap[data.endUserId]) existingMap[data.endUserId] = [];
    existingMap[data.endUserId].push(data);
  });

  // 3. Process each stuck user
  const usersToProcess = stuckUsers;
  let realTestSent = false;
  
  for (const user of usersToProcess) {
    stats.investigated++;
    
    // Check limits & duplicates
    const userInterventions = existingMap[user.id] || [];
    
    // Prevent exceeding max nudges overall
    if (userInterventions.length >= maxNudges) {
      stats.skipped++;
      continue;
    }
    
    // Prevent duplicate intervention for the same step
    const alreadyNudgedForStep = userInterventions.some(inv => inv.stalledStep === user.currentStep);
    if (alreadyNudgedForStep) {
      stats.skipped++;
      continue;
    }

    stats.eligible++;

    // 4. Diagnose & Generate (Agentic loop)
    try {
      const draft = await generateIntervention(ownerUid, workspaceId, user.id, user.currentStep);
      if (!draft) {
        stats.failed++;
        continue;
      }
      stats.generated++;

      // 5. Final State Check (Progression Cancellation)
      const freshUserSnap = await db.collection('endUsers').doc(user.id).get();
      const freshUser = freshUserSnap.data();
      
      if (freshUser.currentStep !== user.currentStep || freshUser.status !== 'stuck') {
        await db.collection('interventions').doc(draft.id).update({
          status: 'failed',
          failReason: 'user_progressed_before_send'
        });
        stats.skipped++;
        continue;
      }

      // 6. Validate
      if (!draft.subject || !draft.body || draft.body.split(/\s+/).length >= 120) {
        await db.collection('interventions').doc(draft.id).update({
          status: 'failed',
          failReason: 'validation_failed'
        });
        stats.failed++;
        continue;
      }

      // Mark validated
      await db.collection('interventions').doc(draft.id).update({
        status: 'validated'
      });

      // 7. Auto-send (Demo Mode: 1 Real, Rest Simulated)
      if (!realTestSent) {
        const sendResult = await sendInterventionEmail(draft);
        if (sendResult.success) {
          await db.collection('interventions').doc(draft.id).update({
            status: 'sent',
            sentAtMs: simNowMs,
            sendResult
          });
          stats.sent++;
          realTestSent = true;
        } else {
          await db.collection('interventions').doc(draft.id).update({
            status: 'failed',
            failReason: 'send_failed'
          });
          stats.failed++;
        }
      } else {
        await db.collection('interventions').doc(draft.id).update({
          status: 'simulated',
          sentAtMs: simNowMs,
          sendResult: {
            success: true,
            provider: 'simulated',
            providerMessageId: `simulated-${draft.id}`,
            recipientMode: 'simulated'
          }
        });
        stats.sent++;
      }

    } catch (err) {
      console.error(`Error processing user ${user.id}:`, err);
      stats.failed++;
    }
  }

  return stats;
}

module.exports = { runAutonomousRecovery };
