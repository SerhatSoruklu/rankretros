const { Schema, model } = require('mongoose');

const userSchema = new Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['user', 'owner', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = model('User', userSchema);
