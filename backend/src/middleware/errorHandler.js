const logger = require('../utils/logger');

// Express error-handling middleware
function errorHandler(err, req, res, next) {
  logger.error('Unhandled error', err);

  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({
    error: true,
    message
  });
}

module.exports = errorHandler;