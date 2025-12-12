const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

function buildUserPayload(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt
  };
}

function generateToken(user) {
  const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
  if (!process.env.JWT_SECRET) {
    console.warn('JWT_SECRET not set; using insecure fallback. Set JWT_SECRET in production.');
  }

  return jwt.sign(
    { id: user._id, username: user.username, email: user.email, role: user.role },
    secret,
    { expiresIn: '7d' }
  );
}

async function register(req, res, next) {
  try {
    const { username, email, password, role } = req.body;
    if (!username || !email || !password) {
      const err = new Error('username, email, and password are required');
      err.status = 400;
      return next(err);
    }

    const existing = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }]
    });
    if (existing) {
      const field = existing.email === email.toLowerCase() ? 'email' : 'username';
      const err = new Error(`A user with that ${field} already exists`);
      err.status = 409;
      return next(err);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email: email.toLowerCase(),
      passwordHash,
      role: role && ['user', 'owner', 'admin'].includes(role) ? role : 'user'
    });

    const token = generateToken(user);
    res.status(201).json({ user: buildUserPayload(user), token });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, username, password } = req.body;
    if (!password || (!email && !username)) {
      const err = new Error('email or username and password are required');
      err.status = 400;
      return next(err);
    }

    const user = await User.findOne(email ? { email: email.toLowerCase() } : { username });
    if (!user) {
      const err = new Error('Invalid credentials');
      err.status = 401;
      return next(err);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      const err = new Error('Invalid credentials');
      err.status = 401;
      return next(err);
    }

    const token = generateToken(user);
    res.json({ user: buildUserPayload(user), token });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login
};
