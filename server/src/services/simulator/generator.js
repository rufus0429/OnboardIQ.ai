const { db } = require('../../config/firebase');
const { executeBatch } = require('../../repo/workspaces');
const { mulberry32, generateId, pickRandom } = require('../../utils/rng');

const PLANS = ['free', 'starter', 'pro'];
const SOURCES = ['organic', 'ads', 'referral'];
const COMPANY_SIZES = ['solo', 'small', 'mid'];
const STEPS = [
  'signup',
  'verify_email',
  'create_project',
  'connect_data_source',
  'invite_teammate',
  'first_report'
];

async function clearWorkspaceData(ownerUid, workspaceId) {
  const batchOps = [];
  const addDeleteOps = async (collectionName) => {
    const snapshot = await db.collection(collectionName)
      .where('workspaceId', '==', workspaceId)
      .where('ownerUid', '==', ownerUid)
      .get();
    snapshot.docs.forEach(doc => {
      batchOps.push({ type: 'delete', ref: doc.ref });
    });
  };

  await addDeleteOps('endUsers');
  await addDeleteOps('events');
  await addDeleteOps('diagnoses');
  await addDeleteOps('interventions');
  await addDeleteOps('outcomes');
  
  if (batchOps.length > 0) {
    await executeBatch(batchOps);
  }
}

async function seedSimulator(ownerUid, workspaceId, config) {
  const { userCount, plantedStep, plantedDropRate, noiseLevel, seed } = config;
  
  await clearWorkspaceData(ownerUid, workspaceId);
  
  const prng = mulberry32(seed);
  const simNowMs = Date.now(); // Start simulator clock at true now
  
  const batchOps = [];
  
  // Set simulator clock
  const wsRef = db.collection('workspaces').doc(workspaceId);
  batchOps.push({
    type: 'set',
    ref: wsRef,
    merge: true,
    data: {
      ownerUid,
      simNowMs,
      seedConfig: config
    }
  });

  const generateUser = () => {
    const endUserId = generateId(prng);
    const plan = pickRandom(prng, PLANS);
    const signupSource = pickRandom(prng, SOURCES);
    const companySize = pickRandom(prng, COMPANY_SIZES);
    
    // Determine hidden persona and drop-off step
    let hiddenPersona = 'will_progress_anyway';
    let finalStepIndex = STEPS.length - 1; // Default to finishing all steps
    
    // Apply planted problem logic
    const plantedStepIndex = STEPS.indexOf(plantedStep);
    
    if (prng() < plantedDropRate) {
      finalStepIndex = plantedStepIndex;
      // Half will never progress, half will if nudged
      hiddenPersona = prng() > 0.5 ? 'will_never_progress' : 'will_progress_if_nudged';
    } else if (prng() < noiseLevel) {
      // Background noise drops at random steps
      finalStepIndex = Math.floor(prng() * STEPS.length);
      hiddenPersona = prng() > 0.7 ? 'will_progress_if_nudged' : 'will_never_progress';
    }
    
    const events = [];
    let currentTs = simNowMs - (3 * 24 * 60 * 60 * 1000) + (prng() * 2 * 24 * 60 * 60 * 1000); // Between 3 and 1 days ago
    
    let lastProgressAtMs = currentTs;
    
    for (let i = 0; i <= finalStepIndex; i++) {
      const step = STEPS[i];
      // Time between steps: 5 minutes to 2 hours
      const timeToNext = (5 * 60 * 1000) + (prng() * 115 * 60 * 1000);
      currentTs += timeToNext;
      
      if (currentTs > simNowMs && hiddenPersona !== 'will_progress_anyway') {
         // Don't generate future events for stuck users
         finalStepIndex = i - 1;
         break;
      }
      
      events.push({
        id: generateId(prng),
        endUserId,
        workspaceId,
        ownerUid,
        step,
        tsMs: currentTs
      });
      lastProgressAtMs = currentTs;
    }
    
    const userDoc = {
      workspaceId,
      ownerUid,
      name: `User ${endUserId.substring(0, 5)}`,
      email: `${endUserId.substring(0, 5)}@example.com`,
      plan,
      signupSource,
      companySize,
      currentStep: STEPS[finalStepIndex] || 'signup',
      status: finalStepIndex === STEPS.length - 1 ? 'activated' : 'stuck',
      lastProgressAtMs,
      hiddenPersona, // MUST NEVER BE EXPOSED TO FRONTEND
      createdAt: simNowMs
    };
    
    return { userDoc, endUserId, events };
  };

  for (let i = 0; i < userCount; i++) {
    const { userDoc, endUserId, events } = generateUser();
    batchOps.push({
      type: 'set',
      ref: db.collection('endUsers').doc(endUserId),
      data: userDoc
    });
    
    for (const ev of events) {
      batchOps.push({
        type: 'set',
        ref: db.collection('events').doc(ev.id),
        data: ev
      });
    }
  }

  await executeBatch(batchOps);
  return { simNowMs, userCount };
}

module.exports = { seedSimulator, clearWorkspaceData };
