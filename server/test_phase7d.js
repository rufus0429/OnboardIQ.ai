const assert = require('assert');
const proxyquire = require('proxyquire');

let resendCalledWith = null;

const emailModule = proxyquire('./src/services/email', {
  'resend': {
    Resend: class {
      constructor(key) {
        this.key = key;
        this.emails = {
          send: async (payload) => {
            resendCalledWith = payload;
            if (payload.to === 'fail@example.com') {
              return { error: { message: 'Forced failure' } };
            }
            return { data: { id: 'test_msg_123' }, error: null };
          }
        };
      }
    }
  },
  '../config/env': {
    env: {
      SEND_MODE: 'resend',
      RESEND_API_KEY: 'test_key',
      RESEND_FROM: 'Test <test@example.com>',
      RESEND_TEST_TO: 'safe@example.com'
    }
  }
});

async function runTests() {
  console.log('--- RUNNING PHASE 7D TESTS ---');

  const intervention = {
    id: 'inv_abc',
    endUserId: 'simulated@user.com',
    subject: 'Test Nudge',
    body: 'This is a test nudge body.',
  };

  const result = await emailModule.sendInterventionEmail(intervention);

  console.log('Testing recipient redirect & idempotency...');
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.provider, 'resend');
  assert.strictEqual(result.providerMessageId, 'test_msg_123');
  assert.strictEqual(result.recipientMode, 'test_redirect');
  
  assert.strictEqual(resendCalledWith.to, 'safe@example.com', 'Recipient should be redirected to RESEND_TEST_TO');
  assert.strictEqual(resendCalledWith.from, 'Test <test@example.com>', 'Sender must be from env');
  assert.strictEqual(resendCalledWith.headers['Idempotency-Key'], 'onboardiq/intervention/inv_abc', 'Idempotency key must match intervention ID');

  console.log('Testing failure handling...');
  const failResult = await emailModule.sendInterventionEmail({ ...intervention, endUserId: 'fail@example.com' });
  // Since RESEND_TEST_TO redirects everything, fail@example.com becomes safe@example.com.
  // We need to bypass the redirect for the fail test, or we can just assume it returns properly if error occurs.
  // To test it, let's proxyquire again without RESEND_TEST_TO.
  
  const emailModuleFail = proxyquire('./src/services/email', {
    'resend': {
      Resend: class {
        constructor() {
          this.emails = {
            send: async (p) => ({ error: { message: 'Failure' } })
          };
        }
      }
    },
    '../config/env': {
      env: { SEND_MODE: 'resend', RESEND_API_KEY: 'key', RESEND_FROM: 'from' }
    }
  });

  const fResult = await emailModuleFail.sendInterventionEmail(intervention);
  assert.strictEqual(fResult.success, false);
  assert.strictEqual(fResult.providerMessageId, null);

  console.log('Testing initialization fails without key...');
  assert.throws(() => {
    proxyquire('./src/services/email', {
      '../config/env': {
        env: { SEND_MODE: 'resend' } // no api key
      }
    });
  }, /RESEND_API_KEY is missing/);

  console.log('--- ALL PHASE 7D TESTS PASSED ---');
}

runTests().catch(console.error);
