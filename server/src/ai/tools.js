const { getWorkspaceUsers, getUserJourney } = require('../repo/endUsers');
const { calculateFunnel } = require('../services/funnel');
const { summarizeStuckUsers } = require('../services/stall');
const { compareCohorts } = require('../services/cohort');
const { db } = require('../config/firebase');
const { generateId } = require('../utils/rng');

// The tools registry
const tools = {
  get_funnel_stats: {
    description: 'Get the current onboarding funnel statistics including conversion and drop-off rates.',
    parameters: { type: 'OBJECT', properties: {} },
    execute: async (args, ctx) => {
      const users = await getWorkspaceUsers(ctx.ownerUid, ctx.workspaceId);
      return calculateFunnel(users);
    }
  },
  
  get_stuck_users_summary: {
    description: 'Get a summary of stuck users for a specific onboarding step.',
    parameters: {
      type: 'OBJECT',
      properties: { step: { type: 'STRING' } },
      required: ['step']
    },
    execute: async (args, ctx) => {
      const users = await getWorkspaceUsers(ctx.ownerUid, ctx.workspaceId);
      const summary = summarizeStuckUsers(users, ctx.simNowMs);
      return summary.find(s => s.step === args.step) || { step: args.step, stuckUserCount: 0 };
    }
  },

  compare_to_successful_cohort: {
    description: 'Compare stuck users against successful/activated users.',
    parameters: {
      type: 'OBJECT',
      properties: { step: { type: 'STRING' } },
      required: ['step']
    },
    execute: async (args, ctx) => {
      const users = await getWorkspaceUsers(ctx.ownerUid, ctx.workspaceId);
      // Real logic might filter by step, but cohort.js compares all stuck vs activated
      return compareCohorts(users);
    }
  },

  get_user_journey: {
    description: 'Get the journey and events for a specific user to inspect behavior.',
    parameters: {
      type: 'OBJECT',
      properties: { endUserId: { type: 'STRING' } },
      required: ['endUserId']
    },
    execute: async (args, ctx) => {
      return await getUserJourney(ctx.ownerUid, ctx.workspaceId, args.endUserId);
    }
  },

  save_diagnosis: {
    description: 'Save the official diagnosis for the onboarding drop-off.',
    parameters: {
      type: 'OBJECT',
      properties: {
        step: { type: 'STRING' },
        stallCause: { type: 'STRING' },
        hypothesis: { type: 'STRING' },
        proposedFix: { type: 'STRING' },
        confidence: { type: 'STRING' },
        affectedUserCount: { type: 'INTEGER' },
        evidence: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              fact: { type: 'STRING' },
              value: { type: 'STRING' },
              source: { type: 'STRING' }
            },
            required: ['fact', 'value', 'source']
          }
        }
      },
      required: ['step', 'stallCause', 'hypothesis', 'proposedFix', 'confidence', 'affectedUserCount', 'evidence']
    },
    execute: async (args, ctx) => {
      // Validate schema in agent.js before this is called or here
      const diagnosisId = generateId(() => Math.random());
      const doc = {
        ...args,
        id: diagnosisId,
        ownerUid: ctx.ownerUid,
        workspaceId: ctx.workspaceId,
        createdAt: Date.now(),
        agentTrace: ctx.agentTrace || []
      };
      
      // Real DB save
      await db.collection('diagnoses').doc(diagnosisId).set(doc);
      return { success: true, diagnosisId };
    }
  },

  save_nudge_draft: {
    description: 'Save a personalized nudge draft for a stuck user.',
    parameters: {
      type: 'OBJECT',
      properties: {
        endUserId: { type: 'STRING' },
        diagnosisId: { type: 'STRING' },
        channel: { type: 'STRING' },
        tone: { type: 'STRING' },
        subject: { type: 'STRING' },
        body: { type: 'STRING' }
      },
      required: ['endUserId', 'diagnosisId', 'channel', 'tone', 'subject', 'body']
    },
    execute: async (args, ctx) => {
      // Check word count constraint
      const wordCount = args.body.split(/\s+/).length;
      if (wordCount >= 120) {
        throw new Error('Nudge body exceeds 120 words constraint.');
      }
      
      const nudgeId = generateId(() => Math.random());
      const doc = {
        ...args,
        id: nudgeId,
        ownerUid: ctx.ownerUid,
        workspaceId: ctx.workspaceId,
        status: 'drafted',
        createdAt: Date.now()
      };
      
      await db.collection('interventions').doc(nudgeId).set(doc);
      return { success: true, nudgeId };
    }
  }
};

const toolDeclarations = Object.keys(tools).map(name => ({
  name,
  description: tools[name].description,
  parameters: tools[name].parameters
}));

module.exports = { tools, toolDeclarations };
