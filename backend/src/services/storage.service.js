const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');
const path = require('path');
const mime = require('mime-types');
const logger = require('../utils/logger');

const bucket = process.env.DO_SPACES_BUCKET || 'rankretros-spaces';
const region = process.env.DO_SPACES_REGION || 'lon1';
const configuredEndpoint = process.env.DO_SPACES_ENDPOINT || `https://${region}.digitaloceanspaces.com`;
const publicBaseUrl = (process.env.IMG_BASE_URL || `https://${bucket}.${region}.digitaloceanspaces.com`).replace(
  /\/$/,
  ''
);

if (!process.env.DO_SPACES_KEY || !process.env.DO_SPACES_SECRET) {
  logger.warn('DO_SPACES_KEY/DO_SPACES_SECRET not set; uploads will fail until configured.');
}

const s3 = new S3Client({
  region,
  endpoint: configuredEndpoint,
  forcePathStyle: false,
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY || '',
    secretAccessKey: process.env.DO_SPACES_SECRET || ''
  }
});

function buildKey(folder, originalName, mimeType) {
  const safeFolder = (folder || '').replace(/^\/|\/$/g, '');
  const extFromMime = mime.extension(mimeType || '') ? `.${mime.extension(mimeType)}` : '';
  const ext = extFromMime || path.extname(originalName || '') || '';
  const unique = `${Date.now()}-${crypto.randomUUID()}`;
  return `${safeFolder}/${unique}${ext}`;
}

async function uploadToSpaces({ folder, file }) {
  if (!file?.buffer) {
    const err = new Error('File buffer missing');
    err.status = 400;
    throw err;
  }

  const key = buildKey(folder, file.originalname, file.mimetype);

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype || 'application/octet-stream',
    ACL: 'public-read'
  });

  await s3.send(command);

  return {
    key,
    url: `${publicBaseUrl}/${key}`
  };
}

module.exports = {
  uploadToSpaces,
  deleteFromSpaces
};

async function deleteFromSpaces(keyOrUrl) {
  const key = extractKey(keyOrUrl);
  if (!key) {
    const err = new Error('Invalid key');
    err.status = 400;
    throw err;
  }

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key
  });

  await s3.send(command);
  return { deleted: true, key };
}

function extractKey(keyOrUrl = '') {
  if (!keyOrUrl) return '';
  if (keyOrUrl.includes(bucket)) {
    try {
      const url = new URL(keyOrUrl);
      return url.pathname.replace(/^\/|\/$/g, '');
    } catch {
      return '';
    }
  }
  return keyOrUrl.replace(/^\/|\/$/g, '');
}
