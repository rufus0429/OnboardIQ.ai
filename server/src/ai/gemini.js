const { GoogleGenAI } = require('@google/genai');
const { env } = require('../config/env');
const { logger } = require('../app'); // need to extract logger or just require pino

let ai;
if (env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
} else {
  // Mock client for testing when no key
  ai = {
    models: {
      generateContent: async () => ({ text: () => '{}' })
    }
  };
}

module.exports = { ai };
