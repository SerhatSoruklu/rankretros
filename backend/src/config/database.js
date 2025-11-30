const mongoose = require('mongoose');
const logger = require('../utils/logger');

async function connectDb() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/rankretros';

  if (!process.env.MONGO_URI) {
    logger.warn(
      'MONGO_URI is not set; falling back to local MongoDB at mongodb://127.0.0.1:27017/rankretros'
    );
  }

  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(uri);
    logger.info('Connected to MongoDB');
  } catch (err) {
    logger.error('MongoDB connection error', err);
    throw err;
  }
}

module.exports = connectDb;
