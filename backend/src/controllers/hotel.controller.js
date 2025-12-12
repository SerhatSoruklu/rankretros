const mongoose = require('mongoose');
const HabboServer = require('../models/HabboServer');

async function createHotel(req, res, next) {
  try {
    if (!req.user) {
      const err = new Error('Unauthorized');
      err.status = 401;
      return next(err);
    }

    const { name, slug, description, bannerUrl, callbackUrl, rewards = {}, tags = [] } = req.body;
    if (!name || !slug || !callbackUrl || !bannerUrl || !description) {
      const err = new Error('name, slug, description, callbackUrl, and bannerUrl are required');
      err.status = 400;
      return next(err);
    }

    const ownerId = req.user.id || req.user._id;

    const hotel = await HabboServer.create({
      ownerId,
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      description: description.trim(),
      bannerUrl: bannerUrl.trim(),
      callbackUrl: callbackUrl.trim(),
      rewards: {
        credits: Number(rewards.credits) || 0,
        diamonds: Number(rewards.diamonds) || 0,
        duckets: Number(rewards.duckets) || 0
      },
      tags: Array.isArray(tags) ? tags.slice(0, 8).map(t => String(t).trim()) : []
    });

    res.status(201).json(hotel);
  } catch (err) {
    if (err.code === 11000) {
      err.status = 409;
      err.message = 'Hotel with this slug already exists';
    }
    next(err);
  }
}

async function listHotels(req, res, next) {
  try {
    const hotels = await HabboServer.find({}).sort({ totalVotes: -1 });
    res.json(hotels);
  } catch (err) {
    next(err);
  }
}

async function getHotelById(req, res, next) {
  try {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { slug: id.toLowerCase() };
    const hotel = await HabboServer.findOne(query);
    if (!hotel) {
      const err = new Error('Hotel not found');
      err.status = 404;
      return next(err);
    }
    res.json(hotel);
  } catch (err) {
    next(err);
  }
}

async function updateHotel(req, res, next) {
  try {
    if (!req.user) {
      const err = new Error('Unauthorized');
      err.status = 401;
      return next(err);
    }

    const { id } = req.params;
    const hotel = await HabboServer.findById(id);
    if (!hotel) {
      const err = new Error('Hotel not found');
      err.status = 404;
      return next(err);
    }

    const requesterId = req.user.id || req.user._id?.toString();
    if (hotel.ownerId.toString() !== requesterId && req.user.role !== 'admin') {
      const err = new Error('Forbidden');
      err.status = 403;
      return next(err);
    }

    const updates = {};
    const allowed = ['name', 'slug', 'description', 'bannerUrl', 'callbackUrl', 'rewards', 'views', 'tags'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (updates.rewards) {
      updates.rewards = {
        credits: Number(updates.rewards.credits) || 0,
        diamonds: Number(updates.rewards.diamonds) || 0,
        duckets: Number(updates.rewards.duckets) || 0
      };
    }

    if (updates.slug) {
      updates.slug = updates.slug.toString().trim().toLowerCase();
    }

    if (updates.bannerUrl) {
      updates.bannerUrl = updates.bannerUrl.toString().trim();
    }

    if (updates.callbackUrl) {
      updates.callbackUrl = updates.callbackUrl.toString().trim();
    }

    if (updates.description) {
      updates.description = updates.description.toString().trim();
    }

    if (updates.tags !== undefined) {
      updates.tags = Array.isArray(updates.tags) ? updates.tags.slice(0, 8).map(t => String(t).trim()) : [];
    }

    Object.assign(hotel, updates);
    await hotel.save();

    res.json(hotel);
  } catch (err) {
    if (err.code === 11000) {
      err.status = 409;
      err.message = 'Hotel with this slug already exists';
    }
    next(err);
  }
}

async function deleteHotel(req, res, next) {
  try {
    if (!req.user) {
      const err = new Error('Unauthorized');
      err.status = 401;
      return next(err);
    }

    const { id } = req.params;
    const hotel = await HabboServer.findById(id);
    if (!hotel) {
      const err = new Error('Hotel not found');
      err.status = 404;
      return next(err);
    }

    const requesterId = req.user.id || req.user._id?.toString();
    if (hotel.ownerId.toString() !== requesterId && req.user.role !== 'admin') {
      const err = new Error('Forbidden');
      err.status = 403;
      return next(err);
    }

    await hotel.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createHotel,
  listHotels,
  getHotelById,
  updateHotel,
  deleteHotel
};
