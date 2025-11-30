const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 10;
const ipHits = new Map();

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    return xff.split(',')[0].trim();
  }
  if (Array.isArray(xff) && xff.length > 0) {
    return xff[0];
  }
  return req.ip || req.connection?.remoteAddress || '';
}

function voteRateLimit(req, res, next) {
  const ip = getClientIp(req);
  if (!ip) {
    return res.status(400).json({ error: true, message: 'Unable to determine IP' });
  }

  const now = Date.now();
  const recent = (ipHits.get(ip) || []).filter((ts) => now - ts < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS) {
    return res
      .status(429)
      .json({ error: true, message: 'Too many vote callbacks from this IP. Please slow down.' });
  }

  recent.push(now);
  ipHits.set(ip, recent);
  req.clientIp = ip;
  next();
}

module.exports = voteRateLimit;
