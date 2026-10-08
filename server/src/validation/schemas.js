const { z } = require('zod');

const StepKey = z.enum([
  'signup',
  'verify_email',
  'create_project',
  'connect_data_source',
  'invite_teammate',
  'first_report'
]);

const SeedSchema = z.object({
  userCount: z.number().int().min(10).max(1000).default(400),
  plantedStep: StepKey.default('connect_data_source'),
  plantedDropRate: z.number().min(0).max(1).default(0.55),
  noiseLevel: z.number().min(0).max(1).default(0.2),
  seed: z.number().int().default(123456789)
});

const AdvanceSchema = z.object({
  hours: z.number().int().min(1).max(168)
});

module.exports = {
  StepKey,
  SeedSchema,
  AdvanceSchema
};
