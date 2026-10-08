const { auth } = require('../config/firebase');

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' } });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Test bypass for Phase 3 verification
    if (process.env.NODE_ENV !== 'production' && token === 'test-token') {
      req.uid = 'test-uid';
      req.user = { uid: 'test-uid', email: 'test@example.com' };
      return next();
    }

    const decodedToken = await auth.verifyIdToken(token, true); // true = check revocation
    
    req.uid = decodedToken.uid;
    req.user = { uid: decodedToken.uid, email: decodedToken.email };
    next();
  } catch (error) {
    req.log.error(error, 'Auth error');
    return res.status(401).json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or revoked token' } });
  }
};

module.exports = { requireAuth };
