const express = require('express');
const auth = require('../middleware/auth');
const userController = require('../controllers/user.controller');

const router = express.Router();

router.put('/me', auth, userController.updateProfile);
router.put('/me/password', auth, userController.updatePassword);
router.delete('/me', auth, userController.deleteAccount);

module.exports = router;
