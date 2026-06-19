// SPDX-License-Identifier: MIT
const {
  securityHeaders,
} = require("../../../utils/middleware/securityHeaders");

function mockRes() {
  return {
    headers: {},
    removed: [],
    setHeader(k, v) {
      this.headers[k] = v;
    },
    removeHeader(k) {
      this.removed.push(k);
    },
  };
}

describe("securityHeaders", () => {
  beforeEach(() => {
    delete process.env.ENABLE_HSTS;
    delete process.env.CSP_REPORT_ONLY;
  });

  afterEach(() => {
    delete process.env.ENABLE_HSTS;
    delete process.env.CSP_REPORT_ONLY;
  });

  it("sets baseline headers on every response and calls next", () => {
    const mw = securityHeaders();
    const res = mockRes();
    const next = jest.fn();

    mw({}, res, next);

    expect(res.headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(res.headers["X-Frame-Options"]).toBe("DENY");
    expect(res.headers["Referrer-Policy"]).toBe(
      "strict-origin-when-cross-origin"
    );
    expect(res.headers["Permissions-Policy"]).toContain("camera=()");
    expect(res.headers["Permissions-Policy"]).toContain("microphone=(self)");
    expect(res.removed).toContain("X-Powered-By");
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("does not set HSTS by default but enforces a baseline CSP", () => {
    const mw = securityHeaders();
    const res = mockRes();
    mw({}, res, jest.fn());

    expect(res.headers["Strict-Transport-Security"]).toBeUndefined();
    expect(res.headers["Content-Security-Policy-Report-Only"]).toBeUndefined();
    const csp = res.headers["Content-Security-Policy"];
    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("sets HSTS when ENABLE_HSTS=true", () => {
    process.env.ENABLE_HSTS = "true";
    const mw = securityHeaders();
    const res = mockRes();
    mw({}, res, jest.fn());

    expect(res.headers["Strict-Transport-Security"]).toContain("max-age=");
    expect(res.headers["Strict-Transport-Security"]).not.toContain("preload");
  });

  it("sets report-only CSP alongside enforced CSP when CSP_REPORT_ONLY=true", () => {
    process.env.CSP_REPORT_ONLY = "true";
    const mw = securityHeaders();
    const res = mockRes();
    mw({}, res, jest.fn());

    const reportOnly = res.headers["Content-Security-Policy-Report-Only"];
    expect(reportOnly).toContain("default-src 'self'");
    expect(reportOnly).toContain("frame-ancestors 'none'");
    expect(reportOnly).toContain("worker-src 'self' blob:");
    expect(res.headers["Content-Security-Policy"]).toContain(
      "default-src 'self'",
    );
  });
});
