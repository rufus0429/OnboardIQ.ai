const { z } = require('zod');

const InterventionStateEnum = z.enum(['drafted', 'validated', 'approved', 'sent', 'rejected', 'failed']);

const InterventionUpdateSchema = z.object({
  subject: z.string().optional(),
  body: z.string().optional(),
  tone: z.enum(['friendly', 'concise', 'helpful_expert']).optional()
}).refine(data => {
  if (data.body) {
    const wordCount = data.body.split(/\s+/).length;
    return wordCount < 120;
  }
  return true;
}, { message: 'Body must be under 120 words' });

const BulkApproveSchema = z.object({
  ids: z.array(z.string()).max(50)
});

const OutcomeSummarySchema = z.object({
  headline: z.string(),
  whatWorked: z.array(z.string()).max(4),
  whatDidNot: z.array(z.string()).max(4),
  nextActions: z.array(z.string()).max(3)
});

module.exports = {
  InterventionStateEnum,
  InterventionUpdateSchema,
  BulkApproveSchema,
  OutcomeSummarySchema
};
