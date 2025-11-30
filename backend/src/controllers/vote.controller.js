const mongoose = require('mongoose');
const HabboServer = require('../models/HabboServer');
const Vote = require('../models/Vote');
const RewardLog = require('../models/RewardLog');
const User = require('../models/User');
const { isProxyIp } = require('../utils/proxyCheck');

const DEFAULT_COOLDOWN_HOURS = 24;

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    return xff.split(',')[0].trim();
  }
  if (Array.isArray(xff) && xff.length > 0) {
    return xff[0];
  }
  return req.ip || req.connection?.remoteAddress || '';
}

async function resolveUserId(userId, username) {
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    return userId;
  }
  if (username) {
    const user = await User.findOne({ username });
    return user ? user._id : null;
  }
  return null;
}

async function handleVoteCallback(req, res, next) {
  try {
    const sharedSecret = process.env.VOTE_CALLBACK_SECRET;
    const providedToken =
      req.headers['x-callback-token'] ||
      req.headers['x-vote-token'] ||
      req.body.token ||
      req.headers['authorization'];

    if (!sharedSecret) {
      const err = new Error('VOTE_CALLBACK_SECRET not configured');
      err.status = 500;
      return next(err);
    }

    if (providedToken !== sharedSecret) {
      const err = new Error('Invalid callback token');
      err.status = 401;
      return next(err);
    }

    const { hotelSlug, userId, username, source } = req.body;
    if (!hotelSlug) {
      const err = new Error('hotelSlug is required');
      err.status = 400;
      return next(err);
    }

    const ip = req.clientIp || getClientIp(req);
    if (!ip) {
      const err = new Error('Unable to determine IP');
      err.status = 400;
      return next(err);
    }

    if (await isProxyIp(ip)) {
      const err = new Error('Proxy/VPN detected');
      err.status = 403;
      return next(err);
    }

    const hotel = await HabboServer.findOne({ slug: hotelSlug.toLowerCase() });
    if (!hotel) {
      const err = new Error('Hotel not found');
      err.status = 404;
      return next(err);
    }

    const cooldownHours =
      Number(process.env.VOTE_COOLDOWN_HOURS) > 0
        ? Number(process.env.VOTE_COOLDOWN_HOURS)
        : DEFAULT_COOLDOWN_HOURS;
    const since = new Date(Date.now() - cooldownHours * 60 * 60 * 1000);
    const recent = await Vote.findOne({
      hotelId: hotel._id,
      ip,
      createdAt: { $gte: since }
    });

    if (recent) {
      return res.status(429).json({
        error: true,
        message: `You can only vote once every ${cooldownHours} hours from this IP for this hotel.`
      });
    }

    const resolvedUserId = await resolveUserId(userId, username);
    const voteSource = source === 'findretros' ? 'findretros' : 'rankretros';
    const userAgent = req.headers['user-agent'] || '';

    const vote = await Vote.create({
      hotelId: hotel._id,
      userId: resolvedUserId,
      ip,
      userAgent,
      source: voteSource
    });

    await Hotel.findByIdAndUpdate(hotel._id, { $inc: { totalVotes: 1 } });

    const rewards = hotel.rewards || {};
    const rewardEntries = ['credits', 'diamonds', 'duckets']
      .filter((type) => Number(rewards[type]) > 0)
      .map((type) => ({
        hotelId: hotel._id,
        voteId: vote._id,
        userId: resolvedUserId || undefined,
        rewardType: type,
        amount: Number(rewards[type]),
        createdAt: new Date()
      }));

    if (rewardEntries.length) {
      await RewardLog.insertMany(rewardEntries);
      vote.rewarded = true;
      await vote.save();
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleVoteCallback
};
