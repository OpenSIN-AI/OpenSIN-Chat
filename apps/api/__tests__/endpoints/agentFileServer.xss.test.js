// SPDX-License-Identifier: MIT
/**
 * Regression tests for the XSS fix in agentFileServer.js.
 *
 * Background: previously, the server would set `Content-Disposition: inline`
 * for SVG, HTML, and HTM files so they rendered in the browser preview.
 * SVG can carry <script> tags and HTML/HTM obviously can, so any user
 * who could get the agent to save a maliciously-crafted file of those types
 * could achieve stored XSS against anyone with the link.
 *
 * Fix: restrict the inline-disposition Set to truly safe render targets
 * (PDF for the iframe, raster images for <img>). svg/html/htm must fall
 * through to the `attachment` disposition so the browser downloads them
 * instead of rendering them inline.
 *
 * Additionally (defense in depth): every file response carries nosniff,
 * a CSP sandbox, private cache directives, and a same-origin CORP header,
 * so even an inline-rendered document can never execute scripts in the
 * app origin — regardless of future changes to INLINE_EXTENSIONS.
 *
 * These tests guard against anyone "for convenience" re-adding those
 * extensions to the inline Set or dropping the hardening headers.
 */
const {
  INLINE_EXTENSIONS,
  buildFileResponseHeaders,
} = require("../../endpoints/agentFileServer.js");

describe("agentFileServer — XSS regression (Content-Disposition)", () => {
  it("exports INLINE_EXTENSIONS as a Set", () => {
    expect(INLINE_EXTENSIONS).toBeInstanceOf(Set);
  });

  it("contains the safe render targets (PDF, raster images)", () => {
    for (const ext of ["pdf", "png", "jpg", "jpeg", "gif", "webp"]) {
      expect(INLINE_EXTENSIONS.has(ext)).toBe(true);
    }
  });

  // The XSS fix — these three extensions MUST NOT be inline.
  it("does NOT contain svg (scriptable XML, stored-XSS vector)", () => {
    expect(INLINE_EXTENSIONS.has("svg")).toBe(false);
  });

  it("does NOT contain html (raw HTML, stored-XSS vector)", () => {
    expect(INLINE_EXTENSIONS.has("html")).toBe(false);
  });

  it("does NOT contain htm (raw HTML, stored-XSS vector)", () => {
    expect(INLINE_EXTENSIONS.has("htm")).toBe(false);
  });

  it("does not contain other obviously dangerous types", () => {
    for (const ext of ["js", "xml", "xhtml"]) {
      expect(INLINE_EXTENSIONS.has(ext)).toBe(false);
    }
  });
});

describe("agentFileServer — file response headers (defense in depth)", () => {
  const baseFile = {
    mimeType: "image/png",
    safeFilename: "generated-image.png",
    byteLength: 1024,
  };

  it("uses inline disposition for allowed extensions", () => {
    const headers = buildFileResponseHeaders({ ...baseFile, extension: "png" });
    expect(headers["Content-Disposition"]).toBe(
      'inline; filename="generated-image.png"',
    );
  });

  it("uses attachment disposition for svg/html/htm", () => {
    for (const extension of ["svg", "html", "htm"]) {
      const headers = buildFileResponseHeaders({ ...baseFile, extension });
      expect(headers["Content-Disposition"]).toMatch(/^attachment; /);
    }
  });

  it("is case-insensitive for the extension", () => {
    const headers = buildFileResponseHeaders({ ...baseFile, extension: "SVG" });
    expect(headers["Content-Disposition"]).toMatch(/^attachment; /);
  });

  it("always sets nosniff", () => {
    const headers = buildFileResponseHeaders({ ...baseFile, extension: "pdf" });
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
  });

  it("always sets a CSP sandbox (neutralizes scripts in inline documents)", () => {
    for (const extension of ["pdf", "png", "svg", "html"]) {
      const headers = buildFileResponseHeaders({ ...baseFile, extension });
      expect(headers["Content-Security-Policy"]).toBe(
        "sandbox; default-src 'none'",
      );
    }
  });

  it("marks auth-protected files as privately cacheable only", () => {
    const headers = buildFileResponseHeaders({ ...baseFile, extension: "pdf" });
    expect(headers["Cache-Control"]).toBe("private, max-age=0, must-revalidate");
  });

  it("blocks cross-origin embedding via CORP", () => {
    const headers = buildFileResponseHeaders({ ...baseFile, extension: "png" });
    expect(headers["Cross-Origin-Resource-Policy"]).toBe("same-origin");
  });

  it("passes through content type and length", () => {
    const headers = buildFileResponseHeaders({ ...baseFile, extension: "png" });
    expect(headers["Content-Type"]).toBe("image/png");
    expect(headers["Content-Length"]).toBe(1024);
  });
});
