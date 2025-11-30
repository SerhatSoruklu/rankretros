const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');

const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Basic security & parsing
app.use(helmet());
app.use(cors());
app.use(express.json());

// Logging
app.use(morgan('dev'));

// Root health endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'RankRetros API' });
});

// API routes
app.use('/api', routes);

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;