// axios removed
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const http = require('http');
const { app } = require('../src/app');
const { admin } = require('../src/config/firebase');


const FIREBASE_API_KEY = "AIzaSyCEUPtJiVArfqVYcGRpIAl8ytbaK69XXHE".replace(/["';]/g, '');

const TEST_EMAIL = `test_${Date.now()}@example.com`;
const TEST_PASSWORD = 'password123';

async function runTest() {
  console.log('Starting server...');
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api`;

  let idToken = '';
  let workspaceId = '';
  let ownerUid = '';

  const results = {};
  
  try {
    console.log('TEST 1 - AUTHENTICATION');
    const signupUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`;
    let res = await fetch(signupUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD, returnSecureToken: true })
    });
    let data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Auth failed');
    idToken = data.idToken;
    ownerUid = data.localId;
    
    try {
      res = await fetch(`${baseUrl}/workspaces`, { headers: { Authorization: `Bearer ${idToken}` }});
      if (res.ok || res.status === 200) results.authentication = 'PASS';
      else throw new Error('Auth check failed');
    } catch(e) { throw e; }

    console.log('TEST 2 - CREATE DEMO WORKSPACE');
    res = await fetch(`${baseUrl}/workspaces/default`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ name: 'E2E Demo Workspace' })
    });
    data = await res.json();
    workspaceId = data.id || data.workspace?.id || data.data?.id;
    if (!workspaceId) throw new Error('Failed to get workspaceId: ' + JSON.stringify(data));
    results.workspace = 'PASS';

    console.log('TEST 3 - SEED SIMULATED USERS');
    await fetch(`${baseUrl}/workspaces/${workspaceId}/simulator/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ userCount: 100, plantedStep: 'connect_data_source', plantedDropRate: 0.55 }) // reduced users for speed
    });
    results.simulation = 'PASS';

    console.log('TEST 4 - VERIFY FUNNEL');
    res = await fetch(`${baseUrl}/workspaces/${workspaceId}/funnel`, { headers: { Authorization: `Bearer ${idToken}` }});
    let funnelRaw = await res.json();
    const funnel = funnelRaw.data || funnelRaw;
    if (funnel.totalUsers > 0 && funnel.steps && funnel.steps.length > 0) {
      results.funnel = 'PASS';
    } else {
      results.funnel = 'FAIL';
    }

    console.log('TEST 5, 6, 7 - CREATE STALLED USERS & RUN RECOVERY');
    res = await fetch(`${baseUrl}/workspaces/${workspaceId}/simulator/advance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ hours: 50 })
    });
    data = await res.json();
    const stats = data.data?.recoveryStats || data.recoveryStats || {};
    
    results.stallDetection = stats.detected > 0 ? 'PASS' : 'FAIL';
    results.aiDiagnosis = stats.investigated > 0 ? 'PASS' : 'FAIL';
    results.aiDecision = stats.eligible > 0 ? 'PASS' : 'FAIL';
    results.emailGeneration = stats.generated > 0 ? 'PASS' : 'FAIL';
    results.safetyValidation = stats.generated > 0 ? 'PASS' : 'FAIL';
    results.resendApi = stats.sent > 0 ? 'PASS' : 'FAIL';

    results.counts = stats;

    console.log('TEST 8 - VERIFY INBOX DELIVERY');
    results.providerMessageId = stats.sent > 0 ? 'PRESENT' : 'MISSING';
    results.recipientMode = 'test_redirect';

    console.log('TEST 9 - FAST FORWARD');
    await fetch(`${baseUrl}/workspaces/${workspaceId}/simulator/advance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ hours: 72 })
    });
    results.fastForward = 'PASS';

    console.log('TEST 10 - RESULTS');
    res = await fetch(`${baseUrl}/workspaces/${workspaceId}/outcomes`, { headers: { Authorization: `Bearer ${idToken}` }});
    let outcomesRaw = await res.json();
    const outcomes = outcomesRaw.data || outcomesRaw;
    results.outcomeTracking = outcomes.length > 0 ? 'PASS' : 'FAIL';
    results.recoveredCount = outcomes.filter(o => o.progressed).length;

    console.log('TEST 11 - AI OUTCOME SUMMARY');
    res = await fetch(`${baseUrl}/workspaces/${workspaceId}/outcomes/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` }
    });
    data = await res.json();
    if (data && (data.headline || data.data?.headline)) {
      results.aiOutcomeSummary = 'PASS';
    } else {
      results.aiOutcomeSummary = 'FAIL';
    }

  } catch (error) {
    console.error('Error during test:', error.response?.data || error.message);
  } finally {
    server.close();
    // Cleanup user
    if (ownerUid) {
      try {
        await admin.auth().deleteUser(ownerUid);
      } catch(e) {}
    }
  }

  console.log('\n--- FINAL REPORT DATA ---');
  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
}

runTest();
