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
 *  - X-XSS-Protection: 1; mode=block    (legacy XSS protection for older browsers)
 *  - Referrer-Policy: strict-origin-when-cross-origin
 *  - Permissions-Policy                   (kills unused powerful APIs)
 *  - X-Powered-By                         (removed — no stack fingerprinting)
 *  - Strict-Transport-Security            (only when ENABLE_HSTS=true; set it
 *    once TLS termination is confirmed — HSTS on plain HTTP is harmless but
 *    misleading, HSTS behind broken TLS locks users out)
 *  - Content-Security-Policy              (enforced; restricts outbound
 *    fetches to known LLM + storage endpoints, no inline scripts)
 *  - Content-Security-Policy-Report-Only  (only when CSP_REPORT_ONLY=true;
 *    measure violations first, kept on as a parallel signal)
 */

const { randomUUID } = require("crypto");

const PERMISSIONS_POLICY = [
  "camera=()",
  "geolocation=()",
  "payment=()",
  "usb=()",
  // microphone stays self-allowed: speech-to-text uses it
  "microphone=(self)",
].join(", ");

const ENFORCED_CSP_CONNECT_SRC = [
  "'self'",
  "blob:",
  "data:",
  "https://api.anthropic.com",
  "https://api.fireworks.ai",
  "https://api.cohere.ai",
  "https://api.groq.com",
  "https://generativelanguage.googleapis.com",
  "https://api.mistral.ai",
  "https://api.deepseek.com",
  "https://api.perplexity.ai",
  "https://api.together.xyz",
  "https://openrouter.ai",
  "https://api.x.ai",
  "https://ark.cn-beijing.volces.com",
  "https://dashscope.aliyuncs.com",
  "https://api.openai.com/v1",
  "https://api.elevenlabs.io",
  "https://*.supabase.co",
  "https://*.amazonaws.com",
  "https://lh3.googleusercontent.com",
  "https://lh4.googleusercontent.com",
  "https://lh5.googleusercontent.com",
  "https://lh6.googleusercontent.com",
];

function buildEnforcedCsp(nonce) {
  const scriptSrc =
    process.env.NODE_ENV === "production"
      ? `'self' 'nonce-${nonce}' 'wasm-unsafe-eval'`
      : "'self' 'unsafe-inline' 'wasm-unsafe-eval'";
  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    `connect-src ${ENFORCED_CSP_CONNECT_SRC.join(" ")}`,
    "object-src 'none'",
    "upgrade-insecure-requests",
    "frame-src 'self' blob: data:",
    "base-uri 'self'",
    "frame-ancestors 'self'",
    "report-uri /api/csp-violation",
  ].join("; ");
}

const REPORT_ONLY_CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "connect-src *",
  "object-src 'none'",
  "upgrade-insecure-requests",
  "frame-src 'self' blob: data:",
  "base-uri 'self'",
  "frame-ancestors 'self'",
].join("; ");

/**
 * Create the global security-headers middleware.
 * @returns {import("express").RequestHandler}
 */
function securityHeaders() {
  const hstsEnabled = String(process.env.ENABLE_HSTS).toLowerCase() === "true";
  const cspReportOnly =
    String(process.env.CSP_REPORT_ONLY).toLowerCase() === "true";

  return function securityHeadersMiddleware(_request, response, next) {
    response.removeHeader("X-Powered-By");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("X-Frame-Options", "DENY");
    // X-XSS-Protection is deprecated in modern browsers and can introduce
    // vulnerabilities in edge cases. CSP is the modern protection mechanism.
    // Setting to "0" explicitly disables the legacy filter.
    response.setHeader("X-XSS-Protection", "0");
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    response.setHeader("Permissions-Policy", PERMISSIONS_POLICY);

    if (response.locals && typeof response.locals === "object") {
      response.locals.cspNonce = randomUUID().replaceAll("-", "");
    }
    response.setHeader(
      "Content-Security-Policy",
      buildEnforcedCsp(response.locals?.cspNonce || ""),
    );

    if (hstsEnabled)
      response.setHeader(
        "Strict-Transport-Security",
        "max-age=15552000; includeSubDomains",
      );

    if (cspReportOnly)
      response.setHeader(
        "Content-Security-Policy-Report-Only",
        REPORT_ONLY_CSP,
      );

    next();
  };
}

module.exports = { securityHeaders };
