// SPDX-License-Identifier: MIT
const {
  simpleRateLimit,
  _resetRateLimits,
} = require("../../../utils/middleware/simpleRateLimit");

function mockRes() {
  const res = {
    headers: {},
    statusCode: null,
    body: null,
    setHeader(k, v) {
      this.headers[k] = v;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

describe("simpleRateLimit", () => {
  beforeEach(() => {
    _resetRateLimits();
    delete process.env.DISABLE_RATE_LIMITS;
  });

  afterEach(() => {
    delete process.env.DISABLE_RATE_LIMITS;
  });

  it("allows requests under the limit and sets headers", () => {
    const mw = simpleRateLimit({ bucket: "t1", max: 3, windowMs: 60000 });
    const req = { ip: "1.2.3.4" };
    const res = mockRes();
    const next = jest.fn();

    mw(req, res, next);
    mw(req, res, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(res.headers["X-RateLimit-Limit"]).toBe("3");
    expect(res.headers["X-RateLimit-Remaining"]).toBe("1");
    expect(res.statusCode).toBeNull();
  });

  it("returns 429 with Retry-After once the limit is exceeded", () => {
    const mw = simpleRateLimit({ bucket: "t2", max: 2, windowMs: 60000 });
    const req = { ip: "1.2.3.4" };
    const next = jest.fn();

    mw(req, mockRes(), next);
    mw(req, mockRes(), next);
    const res = mockRes();
    mw(req, res, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(res.statusCode).toBe(429);
    expect(res.body.error).toMatch(/too many requests/i);
    expect(Number(res.headers["Retry-After"])).toBeGreaterThan(0);
  });

  it("tracks IPs independently", () => {
    const mw = simpleRateLimit({ bucket: "t3", max: 1, windowMs: 60000 });
    const next = jest.fn();

    mw({ ip: "1.1.1.1" }, mockRes(), next);
    mw({ ip: "2.2.2.2" }, mockRes(), next);

    expect(next).toHaveBeenCalledTimes(2);
  });

  it("tracks buckets independently for the same IP", () => {
    const a = simpleRateLimit({ bucket: "bucket-a", max: 1, windowMs: 60000 });
    const b = simpleRateLimit({ bucket: "bucket-b", max: 1, windowMs: 60000 });
    const req = { ip: "1.2.3.4" };
    const next = jest.fn();

    a(req, mockRes(), next);
    b(req, mockRes(), next);

    expect(next).toHaveBeenCalledTimes(2);
  });

  it("resets after the window expires", () => {
    jest.useFakeTimers();
    const mw = simpleRateLimit({ bucket: "t4", max: 1, windowMs: 1000 });
    const req = { ip: "1.2.3.4" };
    const next = jest.fn();

    mw(req, mockRes(), next);
    const blocked = mockRes();
    mw(req, blocked, next);
    expect(blocked.statusCode).toBe(429);

    jest.advanceTimersByTime(1500);
    Date.now = () => new Date().getTime() + 1500;
    mw(req, mockRes(), next);
    expect(next).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });

  it("can be disabled via DISABLE_RATE_LIMITS=true", () => {
    process.env.DISABLE_RATE_LIMITS = "true";
    const mw = simpleRateLimit({ bucket: "t5", max: 1, windowMs: 60000 });
    const req = { ip: "1.2.3.4" };
    const next = jest.fn();

    for (let i = 0; i < 10; i++) mw(req, mockRes(), next);
    expect(next).toHaveBeenCalledTimes(10);
  });

  it("throws when no bucket name is provided", () => {
    expect(() => simpleRateLimit({ max: 1, windowMs: 1000 })).toThrow();
  });

  it("uses only IP key for user identity when no username is provided", () => {
    const {
      _getBucketKeys,
    } = require("../../../utils/middleware/simpleRateLimit");
    const req = { ip: "1.2.3.4", body: {} };
    const keys = _getBucketKeys({
      request: req,
      bucket: "login",
      identity: "user",
    });
    expect(keys).toEqual(["login:ip:1.2.3.4"]);
  });

  it("uses both IP and account keys for user identity when username is provided", () => {
    const {
      _getBucketKeys,
    } = require("../../../utils/middleware/simpleRateLimit");
    const req = { ip: "1.2.3.4", body: { username: "admin" } };
    const keys = _getBucketKeys({
      request: req,
      bucket: "login",
      identity: "user",
    });
    expect(keys).toEqual(["login:ip:1.2.3.4", "login:account:admin"]);
  });
});
