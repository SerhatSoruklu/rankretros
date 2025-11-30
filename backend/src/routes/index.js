const express = require('express');
const authRoutes = require('./auth.routes');
const hotelRoutes = require('./hotel.routes');
const voteRoutes = require('./vote.routes');
const userRoutes = require('./user.routes');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'RankRetros API',
    timestamp: new Date().toISOString()
  });
});

router.use('/auth', authRoutes);
router.use('/hotels', hotelRoutes);
router.use('/votes', voteRoutes);
router.use('/users', userRoutes);

module.exports = router;
