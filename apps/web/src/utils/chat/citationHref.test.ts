// SPDX-License-Identifier: MIT
/**
 * Unit tests for the citation URL sanitizer (T-0041).
 *
 * Coverage focus:
 *   - Malformed/hallucinated citation URLs are rejected (null).
 *   - Valid absolute IANA/RFC URLs are normalized and accepted.
 *   - Hostname labels that disagree with the destination host are rejected.
 *   - Relative URLs are rejected (never turned into absolute links).
 *   - Non-http(s) protocols are rejected.
 */
import { describe, it, expect } from "vitest";
import { sanitizeCitationHref } from "./citationHref";

describe("chat/citationHref — sanitizeCitationHref", () => {
  describe("hallucinated citation URLs (T-0041)", () => {
    it("rejects a hallucinated hostname concatenated onto a real path", () => {
      const href =
        "https://www.iana.org/domains/reserved/reserved.dreams.direct";
      expect(sanitizeCitationHref(href, "reserved.dreams.direct")).toBeNull();
    });

    it("rejects the same hallucinated URL even with a descriptive label", () => {
      const href =
        "https://www.iana.org/domains/reserved/reserved.dreams.direct";
      expect(sanitizeCitationHref(href, "IANA DNS root zone file")).toBeNull();
    });

    it("rejects a multi-label hostname-shaped path segment", () => {
      expect(
        sanitizeCitationHref(
          "https://example.com/foo/bar.example.net/path",
          "example.net",
        ),
      ).toBeNull();
    });

    it("rejects a label hostname that disagrees with the destination host", () => {
      expect(
        sanitizeCitationHref(
          "https://www.iana.org/domains/reserved",
          "reserved.dreams.direct",
        ),
      ).toBeNull();
    });

    it("accepts a hostname label that matches the destination host", () => {
      const href = "https://www.iana.org/domains/reserved";
      expect(sanitizeCitationHref(href, "www.iana.org")).toBe(href);
    });
  });

  describe("relative / malformed URLs", () => {
    it("rejects a relative URL (no scheme)", () => {
      expect(sanitizeCitationHref("reserved.dreams.direct", "x")).toBeNull();
    });

    it("rejects a protocol-relative URL", () => {
      expect(sanitizeCitationHref("//example.com/page", "x")).toBeNull();
    });

    it("rejects an empty href", () => {
      expect(sanitizeCitationHref("", "x")).toBeNull();
    });

    it("rejects undefined/null href", () => {
      expect(sanitizeCitationHref(null, "x")).toBeNull();
      expect(sanitizeCitationHref(undefined, "x")).toBeNull();
    });

    it("rejects a non-http(s) scheme", () => {
      expect(sanitizeCitationHref("javascript:alert(1)", "x")).toBeNull();
      expect(sanitizeCitationHref("ftp://example.com/x", "x")).toBeNull();
    });

    it("rejects localhost URLs", () => {
      expect(sanitizeCitationHref("http://localhost:3000/x", "x")).toBeNull();
    });

    it("rejects URLs with whitespace in the host", () => {
      expect(sanitizeCitationHref("http://exa mple.com/x", "x")).toBeNull();
    });
  });

  describe("valid citation URLs", () => {
    it("accepts a normal IANA URL", () => {
      expect(
        sanitizeCitationHref("https://www.iana.org/domains/reserved", "IANA"),
      ).toBe("https://www.iana.org/domains/reserved");
    });

    it("accepts a normal IANA assignments URL", () => {
      expect(
        sanitizeCitationHref(
          "https://www.iana.org/assignments/test-net/test-net.xhtml",
          "IETF TEST-NET FAQ",
        ),
      ).toBe("https://www.iana.org/assignments/test-net/test-net.xhtml");
    });

    it("accepts a normal RFC editor URL", () => {
      expect(
        sanitizeCitationHref(
          "https://www.rfc-editor.org/rfc/rfc5737.txt",
          "RFC 5737",
        ),
      ).toBe("https://www.rfc-editor.org/rfc/rfc5737.txt");
    });

    it("accepts a URL with a triple-label dotted path segment ending in a file extension", () => {
      expect(
        sanitizeCitationHref(
          "https://example.com/files/report.rfc.txt",
          "report",
        ),
      ).toBe("https://example.com/files/report.rfc.txt");
    });

    it("preserves the original absolute href (does not re-serialize the URL)", () => {
      const href = "https://www.iana.org:443/domains/reserved";
      expect(sanitizeCitationHref(href, "IANA")).toBe(href);
    });

    it("accepts a URL with a subdomain host that matches the label", () => {
      const href = "https://tools.ietf.org/html/rfc2606";
      expect(sanitizeCitationHref(href, "tools.ietf.org")).toBe(href);
    });
  });
});
