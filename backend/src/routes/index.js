const express = require('express');

const router = express.Router();

// Simple health-check route
router.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'RankRetros API',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
