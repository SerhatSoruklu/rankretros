const { Schema, model, Types } = require('mongoose');

const voteSchema = new Schema({
  hotelId: { type: Types.ObjectId, ref: 'Hotel', required: true },
  userId: { type: Types.ObjectId, ref: 'User' },
  ip: { type: String, required: true, trim: true },
  userAgent: { type: String, trim: true },
  source: { type: String, enum: ['rankretros', 'findretros'], default: 'rankretros' },
  createdAt: { type: Date, default: Date.now },
  rewarded: { type: Boolean, default: false }
});

module.exports = model('Vote', voteSchema);
