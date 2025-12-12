const logger = require('../utils/logger');

// Express error-handling middleware
function errorHandler(err, req, res, next) {
  logger.error('Unhandled error', err);

  const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : err.status || 500;
  const message =
    err.code === 'LIMIT_FILE_SIZE' ? 'File too large. Max 5MB allowed.' : err.message || 'Internal server error';

  res.status(status).json({
    error: true,
    message
  });
}

module.exports = errorHandler;
