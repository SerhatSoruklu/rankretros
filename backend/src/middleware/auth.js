const jwt = require('jsonwebtoken');

function auth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: true, message: 'Unauthorized' });
  }

  const token = header.split(' ')[1];
  try {
    const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
    if (!process.env.JWT_SECRET) {
      console.warn('JWT_SECRET not set; using insecure fallback. Set JWT_SECRET in production.');
    }

    const payload = jwt.verify(token, secret);
    req.user = {
      id: payload.id,
      username: payload.username,
      email: payload.email,
      role: payload.role
    };

    next();
  } catch (err) {
    if (!err.status) {
      err.status = 401;
      err.message = 'Invalid token';
    }
    next(err);
  }
}

module.exports = auth;
