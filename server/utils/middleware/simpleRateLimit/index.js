// SPDX-License-Identifier: MIT
/**
 * simpleRateLimit — dependency-free fixed-window rate limiter middleware.
 *
 * Purpose: Protects expensive or brute-forceable endpoints without adding
 * a third-party dependency. In-memory, per-process (matches the single-node
 * production deployment model of OpenSIN-Chat).
 *
 * Keying: client IP (req.ip, honors Express trust-proxy settings) combined
 * with a route bucket name, so limits are independent per endpoint group.
 *
 * Memory safety: the window store is itself bounded — when it exceeds
 * MAX_TRACKED_KEYS, expired windows are purged; if still over the cap the
 * oldest entries are dropped. This prevents the limiter from becoming its
 * own memory-DoS vector via IP spoofing floods.
 *
 * Per-bucket identity: buckets that opt-in via `opts.identity: "user"` key
 * additionally on the POST username so credential-stuffing from a single
 * IP cannot spray usernames. Without that opt-in, IP-only keying is used.
 */

const MAX_TRACKED_KEYS = 10000;
const buckets = new Map(); // key -> { count, resetAt }

function purge(now) {
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key);
  }
  if (buckets.size > MAX_TRACKED_KEYS) {
    const overflow = buckets.size - MAX_TRACKED_KEYS;
    const keys = buckets.keys();
    for (let i = 0; i < overflow; i++) buckets.delete(keys.next().value);
  }
}

function bucketKey({ request, bucket, identity }) {
  const ip = request.ip || "unknown";
  if (identity !== "user") return `${bucket}:${ip}`;
  const username = (
    typeof request.body?.username === "string" ? request.body.username : ""
  ).trim();
  return `${bucket}:${ip}:${username || "anonymous"}`;
}

/**
 * Create a rate-limiting middleware.
 * @param {Object} opts
 * @param {string} opts.bucket - logical name, e.g. "reports-generate"
 * @param {number} opts.max - max requests per window
 * @param {number} opts.windowMs - window length in milliseconds
 * @param {"ip"|"user"} [opts.identity] - "user" keys on body.username as well
 * @returns {import("express").RequestHandler}
 */
function simpleRateLimit({ bucket, max, windowMs, identity = "ip" }) {
  if (!bucket) throw new Error("simpleRateLimit: bucket is required");

  if (
    String(process.env.DISABLE_RATE_LIMITS).toLowerCase() === "true" &&
    process.env.NODE_ENV === "production"
  ) {
    // eslint-disable-next-line no-console
    console.error(
      "[FATAL] DISABLE_RATE_LIMITS=true in production — refusing to start.",
    );
    process.exit(1);
  }

  return function rateLimitMiddleware(request, response, next) {
    if (String(process.env.DISABLE_RATE_LIMITS).toLowerCase() === "true")
      return next();

    const now = Date.now();
    if (buckets.size > MAX_TRACKED_KEYS) purge(now);

    const key = bucketKey({ request, bucket, identity });
    let entry = buckets.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      buckets.set(key, entry);
    }

    entry.count += 1;

    const remaining = Math.max(0, max - entry.count);
    response.setHeader("X-RateLimit-Limit", String(max));
    response.setHeader("X-RateLimit-Remaining", String(remaining));
    response.setHeader(
      "X-RateLimit-Reset",
      String(Math.ceil(entry.resetAt / 1000)),
    );

    if (entry.count > max) {
      response.setHeader(
        "Retry-After",
        String(Math.ceil((entry.resetAt - now) / 1000)),
      );
      return response
        .status(429)
        .json({ error: "Too many requests. Please slow down." });
    }

    next();
  };
}

/** Test helper — resets all rate-limit state. */
function _resetRateLimits() {
  buckets.clear();
}

module.exports = { simpleRateLimit, _resetRateLimits };
