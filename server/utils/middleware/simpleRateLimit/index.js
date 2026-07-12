// SPDX-License-Identifier: MIT
const consoleLogger = require("../../logger/console.js");

const MAX_TRACKED_KEYS = 10000;
const buckets = new Map();

const RATE_LIMIT_BACKEND = (
  process.env.RATE_LIMIT_BACKEND || "memory"
).toLowerCase();

let redisClient = null;
let redisBump = null;
let redisTtl = null;

if (RATE_LIMIT_BACKEND === "redis") {
  try {
    const IORedis = require("ioredis");
    redisClient = new IORedis(
      process.env.REDIS_URL || "redis://localhost:6379",
      { lazyConnect: true, maxRetriesPerRequest: 1 },
    );
    redisClient.connect().catch((err) => {
      consoleLogger.warn(
        `[simpleRateLimit] Redis connection failed: ${err.message}. Falling back to in-memory.`,
      );
    });
    redisBump = async function (key, windowMs) {
      const v = await redisClient.incr(key);
      if (v === 1) await redisClient.pexpire(key, windowMs);
      return v;
    };
    redisTtl = async function (key) {
      return await redisClient.pttl(key);
    };
  } catch (err) {
    consoleLogger.warn(
      `[simpleRateLimit] RATE_LIMIT_BACKEND=redis requested but ioredis not installed: ${err.message}. Falling back to in-memory.`,
    );
    redisClient = null;
    redisBump = null;
    redisTtl = null;
  }
}

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

function getRealIp(request) {
  // Express's request.ip already respects the `trust proxy` setting and
  // validates X-Forwarded-For from trusted proxies only. The cf-connecting-ip
  // header is a Cloudflare-specific header that any client can spoof — trusting
  // it unconditionally allows an attacker to send a unique value per request
  // and bypass rate limiting entirely. Only trust it when the request comes
  // from a trusted proxy (which Express already validates via request.ip).
  // In practice, request.ip already includes the correct client IP when behind
  // Cloudflare (trust proxy is configured), so we use it directly.
  return request.ip || "unknown";
}

function bucketKeys({ request, bucket, identity }) {
  const ip = getRealIp(request);
  if (identity !== "user") return [`${bucket}:ip:${ip}`];
  const username = (
    typeof request.body?.username === "string" ? request.body.username : ""
  ).trim();
  // In single-user no-password mode there is no username. Account-based rate
  // limiting is meaningless there and would rate-limit the legitimate owner,
  // so we only rate-limit by IP in that case.
  if (!username) return [`${bucket}:ip:${ip}`];
  const safeUser = username.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 64);
  return [`${bucket}:ip:${ip}`, `${bucket}:account:${safeUser}`];
}

function bumpInMemory(keys, max, windowMs) {
  const now = Date.now();
  if (buckets.size > MAX_TRACKED_KEYS) purge(now);
  let blocked = false;
  let resetAt = now;
  let bumpedCount = 0;
  for (const key of keys) {
    let entry = buckets.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      buckets.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) blocked = true;
    if (entry.resetAt > resetAt) resetAt = entry.resetAt;
    if (entry.count > bumpedCount) bumpedCount = entry.count;
  }
  return { blocked, resetAt, bumpedCount };
}

function simpleRateLimit({
  bucket,
  max,
  windowMs,
  identity = "ip",
  skipIf = null,
}) {
  if (!bucket) throw new Error("simpleRateLimit: bucket is required");

  if (
    String(process.env.DISABLE_RATE_LIMITS).toLowerCase() === "true" &&
    process.env.NODE_ENV === "production"
  ) {
    consoleLogger.error(
      "[FATAL] DISABLE_RATE_LIMITS=true in production — refusing to start.",
    );
    process.exit(1);
  }

  return async function rateLimitMiddleware(request, response, next) {
    if (String(process.env.DISABLE_RATE_LIMITS).toLowerCase() === "true")
      return next();
    if (typeof skipIf === "function" && skipIf(request)) return next();

    const keys = bucketKeys({ request, bucket, identity });
    const now = Date.now();
    let result;

    if (redisBump) {
      try {
        const counts = await Promise.all(
          keys.map(async (k) => {
            const v = await redisBump(k, windowMs);
            let keyReset = now + windowMs;
            try {
              const pttl = await redisTtl(k);
              if (typeof pttl === "number" && pttl > 0) keyReset = now + pttl;
            } catch (e) {
              console.warn("[index] non-fatal error:", e?.message || e);
            }
            return { v, keyReset };
          }),
        );
        let blocked = false;
        let resetAt = now;
        let bumpedCount = 0;
        for (const { v, keyReset } of counts) {
          if (v > max) blocked = true;
          if (keyReset > resetAt) resetAt = keyReset;
          if (v > bumpedCount) bumpedCount = v;
        }
        result = { blocked, resetAt, bumpedCount };
      } catch {
        result = bumpInMemory(keys, max, windowMs);
      }
    } else {
      result = bumpInMemory(keys, max, windowMs);
    }

    const remaining = Math.max(0, max - result.bumpedCount);
    response.setHeader("X-RateLimit-Limit", String(max));
    response.setHeader("X-RateLimit-Remaining", String(remaining));
    response.setHeader(
      "X-RateLimit-Reset",
      String(Math.ceil(result.resetAt / 1000)),
    );

    if (result.blocked) {
      response.setHeader(
        "Retry-After",
        String(Math.ceil((result.resetAt - now) / 1000)),
      );
      return response
        .status(429)
        .json({ error: "Too many requests. Please slow down." });
    }

    next();
  };
}

function _resetRateLimits() {
  buckets.clear();
}

module.exports = {
  simpleRateLimit,
  _resetRateLimits,
  _getBucketKeys: bucketKeys,
};
