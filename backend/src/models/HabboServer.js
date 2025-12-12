const { Schema, model, Types } = require('mongoose');

const habboServerSchema = new Schema(
  {
    ownerId: { type: Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true },
    bannerUrl: { type: String, trim: true },
    callbackUrl: { type: String, required: true, trim: true },
    rewards: {
      credits: { type: Number, default: 0 },
      diamonds: { type: Number, default: 0 },
      duckets: { type: Number, default: 0 }
    },
    views: { type: Number, default: 0 },
    totalVotes: { type: Number, default: 0 }
  },
  {
    collection: 'habboservers',
    timestamps: true
  }
);

module.exports = model('HabboServer', habboServerSchema);
