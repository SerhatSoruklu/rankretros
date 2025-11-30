const express = require('express');
const voteController = require('../controllers/vote.controller');
const voteRateLimit = require('../middleware/voteRateLimit');

const router = express.Router();

router.post('/callback', voteRateLimit, voteController.handleVoteCallback);

module.exports = router;
