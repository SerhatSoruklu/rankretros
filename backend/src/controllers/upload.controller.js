const { uploadToSpaces, deleteFromSpaces } = require('../services/storage.service');

async function uploadHabboBanner(req, res, next) {
  try {
    if (!req.file) {
      const err = new Error('File is required');
      err.status = 400;
      return next(err);
    }

    const folder =
      (process.env.HABBO_BANNERS && safeFolderFromUrl(process.env.HABBO_BANNERS)) ||
      process.env.HABBO_BANNER_FOLDER ||
      'habbohotel-server-banners';
    const result = await uploadToSpaces({ folder, file: req.file });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

function safeFolderFromUrl(urlString) {
  try {
    const url = new URL(urlString);
    return url.pathname.replace(/^\/|\/$/g, '');
  } catch {
    return '';
  }
}

module.exports = {
  uploadHabboBanner,
  deleteHabboBanner
};

async function deleteHabboBanner(req, res, next) {
  try {
    if (!req.body?.key && !req.body?.url) {
      const err = new Error('key or url is required');
      err.status = 400;
      return next(err);
    }

    const target = req.body.key || req.body.url;
    const result = await deleteFromSpaces(target);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
