const { auth } = require('../config/firebase');

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' } });
    }

    const token = authHeader.split('Bearer ')[1];
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
