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
 * These tests guard against anyone "for convenience" re-adding those
 * extensions to the inline Set.
 */
describe("agentFileServer — XSS regression (Content-Disposition)", () => {
  const { INLINE_EXTENSIONS } = require("../../endpoints/agentFileServer.js");

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
