const { z } = require('zod');
const { StepKey } = require('./schemas');

const EvidenceItemSchema = z.object({
  fact: z.string(),
  value: z.union([z.string(), z.number()]),
  source: z.string()
});

const DiagnosisResultSchema = z.object({
  step: StepKey,
  stallCause: z.enum([
    'unclear_instructions',
    'technical_friction',
    'missing_value_signal',
    'too_many_steps',
    'needs_human_help',
    'timing_or_intent',
    'other'
  ]),
  hypothesis: z.string(),
  evidence: z.array(EvidenceItemSchema).min(3),
  proposedFix: z.string(),
  confidence: z.enum(['low', 'medium', 'high']),
  affectedUserCount: z.number().int().min(0),
  missingDataNote: z.string().optional()
});

const NudgeSchema = z.object({
  endUserId: z.string(),
  channel: z.enum(['email', 'in_app']).default('email'),
  tone: z.enum(['friendly', 'concise', 'helpful_expert']),
  subject: z.string(),
  body: z.string().max(800) // Word count < 120 handled in logic
});

module.exports = {
  EvidenceItemSchema,
  DiagnosisResultSchema,
  NudgeSchema
};
