const bcrypt = require('bcryptjs');
const User = require('../models/User');
const HabboServer = require('../models/HabboServer');
const Vote = require('../models/Vote');
const RewardLog = require('../models/RewardLog');
const { deleteFromSpaces } = require('../services/storage.service');

async function updateProfile(req, res, next) {
  try {
    const { username, email } = req.body;
    const updates = {};
    if (username) updates.username = username;
    if (email) updates.email = email.toLowerCase();

    if (!Object.keys(updates).length) {
      const err = new Error('No fields to update');
      err.status = 400;
      return next(err);
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    });
  } catch (err) {
    if (err.code === 11000) {
      err.status = 409;
      err.message = 'Username or email already in use';
    }
    next(err);
  }
}

async function updatePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      const err = new Error('Please enter your current and new password.');
      err.status = 400;
      return next(err);
    }
    const user = await User.findById(req.user.id);
    if (!user) {
      const err = new Error('User not found');
      err.status = 404;
      return next(err);
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      const err = new Error('Current password is incorrect');
      err.status = 401;
      return next(err);
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function deleteAccount(req, res, next) {
  try {
    const userId = req.user.id;
    const servers = await HabboServer.find({ ownerId: userId });
    const serverIds = servers.map((s) => s._id);

    if (serverIds.length) {
      // Best-effort banner cleanup
      for (const server of servers) {
        if (server.bannerUrl) {
          deleteFromSpaces(server.bannerUrl).catch(() => {});
        }
      }

      await Vote.deleteMany({ hotelId: { $in: serverIds } });
      await RewardLog.deleteMany({ hotelId: { $in: serverIds } });
      await HabboServer.deleteMany({ _id: { $in: serverIds } });
    }

    await Vote.deleteMany({ userId });
    await RewardLog.deleteMany({ userId });
    await User.findByIdAndDelete(userId);

    res.json({ ok: true, removedServers: serverIds.length });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  updateProfile,
  updatePassword,
  deleteAccount
};
