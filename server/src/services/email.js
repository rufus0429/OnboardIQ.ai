const { Resend } = require('resend');
const { env } = require('../config/env');
// Removed logger due to circular dependency.

// Initialize Resend client singleton
let resendClient = null;
if (env.SEND_MODE === 'resend') {
  if (!env.RESEND_API_KEY) {
    throw new Error('SEND_MODE is resend but RESEND_API_KEY is missing');
  }
  resendClient = new Resend(env.RESEND_API_KEY);
}

/**
 * Sends the intervention email based on the environment SEND_MODE.
 * @param {Object} intervention The intervention draft containing body, subject, endUserId, id.
 * @returns {Promise<Object>} { success: boolean, provider: string, providerMessageId: string|null, recipientMode: string }
 */
async function sendInterventionEmail(intervention) {
  // 1. Mock Mode
  if (env.SEND_MODE === 'mock') {
    return {
      success: true,
      provider: 'mock',
      providerMessageId: `mock-${Date.now()}`,
      recipientMode: 'simulated'
    };
  }

  // 2. Resend Mode
  try {
    // Recipient safety check
    let toEmail = intervention.userEmail || `${intervention.endUserId}@example.com`;
    let recipientMode = 'direct';

    if (env.RESEND_TEST_TO) {
      toEmail = env.RESEND_TEST_TO;
      recipientMode = 'test_redirect';
      console.log(`[Email] Redirecting recipient to: ${toEmail} (recipientMode=test_redirect)`);
    }

    // Build Email
    const htmlBody = `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <p>Hi there,</p>
        <p>${intervention.body.replace(/\n/g, '<br>')}</p>
        <br/>
        <p>Best,<br>The OnboardIQ Team</p>
      </div>
    `;

    const textBody = `Hi there,\n\n${intervention.body}\n\nBest,\nThe OnboardIQ Team`;
    
    const idempotencyKey = `onboardiq/intervention/${intervention.id}`;

    // Send using Resend
    const { data, error } = await resendClient.emails.send({
      from: env.RESEND_FROM,
      to: toEmail,
      subject: intervention.subject,
      html: htmlBody,
      text: textBody,
      headers: {
        'Idempotency-Key': idempotencyKey
      }
    });

    if (error) {
      console.error('[Email] Resend API error:', error);
      return {
        success: false,
        provider: 'resend',
        providerMessageId: null,
        recipientMode
      };
    }

    return {
      success: true,
      provider: 'resend',
      providerMessageId: data.id,
      recipientMode
    };

  } catch (error) {
    console.error('[Email] Failed to send email via Resend:', error);
    return {
      success: false,
      provider: 'resend',
      providerMessageId: null,
      recipientMode: 'unknown'
    };
  }
}

module.exports = { sendInterventionEmail };
