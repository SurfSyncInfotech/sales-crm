const jwt = require('jsonwebtoken');

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = (header.startsWith('Bearer ') ? header.slice(7) : null) || req.query.token;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function requireSuperadmin(req, res, next) {
  if (req.user?.role !== 'superadmin') {
    return res.status(403).json({ message: 'Superadmin access only' });
  }
  next();
}

function requireCompanyUser(req, res, next) {
  if (req.user?.role === 'superadmin' || !req.user?.company_id) {
    return res.status(403).json({ message: 'Company access only' });
  }
  next();
}

module.exports = { authRequired, requireSuperadmin, requireCompanyUser };
