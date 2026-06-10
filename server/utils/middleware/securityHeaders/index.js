// SPDX-License-Identifier: MIT
/**
 * securityHeaders — dependency-free security response headers for ALL routes.
 *
 * Purpose: Previously X-Frame-Options was only set on static assets; API
 * responses and the SSR index page shipped with no security headers at all.
 * This middleware is mounted globally (before all routers) in server/index.js.
 *
 * Headers set:
 *  - X-Content-Type-Options: nosniff      (blocks MIME sniffing)
 *  - X-Frame-Options: DENY                (clickjacking, all routes now)
 *  - Referrer-Policy: strict-origin-when-cross-origin
 *  - Permissions-Policy                   (kills unused powerful APIs)
 *  - X-Powered-By                         (removed — no stack fingerprinting)
 *  - Strict-Transport-Security            (only when ENABLE_HSTS=true; set it
 *    once TLS termination is confirmed — HSTS on plain HTTP is harmless but
 *    misleading, HSTS behind broken TLS locks users out)
 *  - Content-Security-Policy-Report-Only  (only when CSP_REPORT_ONLY=true;
 *    measure violations first, enforce later)
 */

const PERMISSIONS_POLICY = [
  "camera=()",
  "geolocation=()",
  "payment=()",
  "usb=()",
  // microphone stays self-allowed: speech-to-text uses it
  "microphone=(self)",
].join(", ");

// Intentionally permissive starter policy for the report-only phase:
// the SPA uses inline styles, blob workers (TTS/WASM), data: images,
// and talks to configurable LLM endpoints (connect-src must stay open).
const REPORT_ONLY_CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "connect-src *",
  "frame-ancestors 'none'",
].join("; ");

/**
 * Create the global security-headers middleware.
 * @returns {import("express").RequestHandler}
 */
function securityHeaders() {
  const hstsEnabled =
    String(process.env.ENABLE_HSTS).toLowerCase() === "true";
  const cspReportOnly =
    String(process.env.CSP_REPORT_ONLY).toLowerCase() === "true";

  return function securityHeadersMiddleware(_request, response, next) {
    response.removeHeader("X-Powered-By");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    response.setHeader("Permissions-Policy", PERMISSIONS_POLICY);

    if (hstsEnabled)
      response.setHeader(
        "Strict-Transport-Security",
        "max-age=15552000; includeSubDomains" // 180 days, no preload yet
      );

    if (cspReportOnly)
      response.setHeader(
        "Content-Security-Policy-Report-Only",
        REPORT_ONLY_CSP
      );

    next();
  };
}

module.exports = { securityHeaders };
