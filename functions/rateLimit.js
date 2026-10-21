// In-memory fixed-window limiter. State lives per function instance; with maxInstances capped at a
// couple of instances that's close enough to global, and it costs nothing (no Firestore reads/writes).
//
// perIp is fairness between players. The IP comes from X-Forwarded-For, which a client can spoof,
// so the real cost ceiling is `total`: requests per window across everyone on this instance.

const MAX_TRACKED_IPS = 10000;

function createLimiter({ name, perIp, total, windowMs = 60 * 1000, logger }) {
  let windowStart = 0;
  let totalCount = 0;
  let perIpCounts = new Map();
  let warned = false;

  return function allow(ip) {
    const now = Date.now();
    if (now - windowStart >= windowMs) {
      windowStart = now;
      totalCount = 0;
      perIpCounts = new Map();
      warned = false;
    }

    if (totalCount >= total || (perIpCounts.size >= MAX_TRACKED_IPS && !perIpCounts.has(ip))) {
      // Log once per window so a flood doesn't also flood Cloud Logging.
      if (!warned && logger) {
        logger.warn(`[RateLimit] ${name}: instance cap of ${total}/window reached`);
        warned = true;
      }
      return false;
    }

    const count = perIpCounts.get(ip) || 0;
    if (count >= perIp) return false;

    perIpCounts.set(ip, count + 1);
    totalCount += 1;
    return true;
  };
}

const clientIp = req => req.ip || (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';

module.exports = { createLimiter, clientIp };
