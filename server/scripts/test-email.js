require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sendInterventionEmail } = require('../src/services/email');

async function testEmail() {
  const intervention = {
    id: 'test-intervention-' + Date.now(),
    endUserId: 'simulateduser1@example.com', // Will be redirected to RESEND_TEST_TO
    subject: 'Test Email from OnboardIQ',
    body: 'This is a test email sent from the local environment.'
  };

  console.log('Sending test email...');
  const result = await sendInterventionEmail(intervention);
  console.log('Send result:', result);
}

testEmail();
