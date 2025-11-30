const { Schema, model, Types } = require('mongoose');

const rewardLogSchema = new Schema({
  hotelId: { type: Types.ObjectId, ref: 'Hotel', required: true },
  voteId: { type: Types.ObjectId, ref: 'Vote', required: true },
  userId: { type: Types.ObjectId, ref: 'User' },
  rewardType: { type: String, enum: ['credits', 'diamonds', 'duckets'], required: true },
  amount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = model('RewardLog', rewardLogSchema);
