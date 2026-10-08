const { z } = require('zod');

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('10000'),
  CORS_ORIGINS: z.string().optional(),
  LOG_LEVEL: z.string().default('info'),
  FIREBASE_SERVICE_ACCOUNT_BASE64: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  SEND_MODE: z.enum(['mock', 'resend']).default('mock'),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().default('OnboardIQ <hello@onboardiq.app>'),
  RESEND_TEST_TO: z.string().optional()
});

const envParseResult = EnvSchema.safeParse(process.env);

if (!envParseResult.success) {
  console.error('Invalid environment variables:', envParseResult.error.format());
  process.exit(1);
}

const env = envParseResult.data;

if (env.NODE_ENV === 'production') {
  const required = ['FIREBASE_PROJECT_ID', 'FIREBASE_SERVICE_ACCOUNT_BASE64', 'GEMINI_API_KEY', 'GEMINI_MODEL', 'CORS_ORIGINS'];
  if (env.SEND_MODE === 'resend') required.push('RESEND_API_KEY');
  
  const missing = required.filter(k => !env[k]);
  if (missing.length > 0) {
    console.error('Production environment missing required variables:', missing);
    process.exit(1);
  }
}

module.exports = { env };
