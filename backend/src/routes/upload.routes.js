const express = require('express');
const multer = require('multer');
const auth = require('../middleware/auth');
const uploadController = require('../controllers/upload.controller');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    const err = new Error('Only image files (png, jpg, webp, gif) are allowed.');
    err.status = 400;
    return cb(err);
  }
});

router.post('/habbo/banner', auth, upload.single('file'), uploadController.uploadHabboBanner);
router.delete('/habbo/banner', auth, uploadController.deleteHabboBanner);

module.exports = router;
