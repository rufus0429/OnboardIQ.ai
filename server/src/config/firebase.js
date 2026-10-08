const admin = require('firebase-admin');
const { cert, initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

let app;
if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
  const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8'));
  app = initializeApp({
    credential: cert(serviceAccount)
  });
} else {
  // Mock initialization for testing when no env is provided
  app = initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'demo-onboardiq' });
}

const db = getFirestore(app);
const auth = getAuth(app);

module.exports = { admin, db, auth };

