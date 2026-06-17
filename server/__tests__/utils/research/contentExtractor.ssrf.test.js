// SPDX-License-Identifier: MIT
// Docs: contentExtractor.ssrf.test.doc.md
/**
 * SSRF-hardening tests for ContentExtractor.
 *
 * These tests verify the SSRF protections without making real network
 * requests by testing URL parsing, validation, and IP-check logic directly.
 */

const { ContentExtractor } = require("../../../utils/research/contentExtractor");

describe("ContentExtractor SSRF protections", () => {
  describe("URL validation (parseUrl via extract)", () => {
    test("blocks non-http/https protocols (ftp, file, data)", async () => {
      await expect(ContentExtractor.extract("ftp://evil.com/file")).resolves.toBeNull();
      await expect(ContentExtractor.extract("file:///etc/passwd")).resolves.toBeNull();
      await expect(ContentExtractor.extract("data:text/plain,hello")).resolves.toBeNull();
    });

    test("blocks private IPv4 addresses (10.x.x.x, 192.168.x.x, 172.16.x.x)", async () => {
      await expect(ContentExtractor.extract("http://10.0.0.1/admin")).resolves.toBeNull();
      await expect(ContentExtractor.extract("http://192.168.1.1/config")).resolves.toBeNull();
      await expect(ContentExtractor.extract("http://172.16.0.1/secret")).resolves.toBeNull();
    });

    test("blocks loopback and link-local ranges", async () => {
      await expect(ContentExtractor.extract("http://127.0.0.1/api")).resolves.toBeNull();
      await expect(ContentExtractor.extract("http://169.254.1.1/self")).resolves.toBeNull();
      await expect(ContentExtractor.extract("http://0.0.0.0/any")).resolves.toBeNull();
    });

    test("blocks private hostnames (localhost, *.local)", async () => {
      await expect(ContentExtractor.extract("http://localhost:3000/admin")).resolves.toBeNull();
      await expect(ContentExtractor.extract("http://my.internal.service.local/api")).resolves.toBeNull();
      await expect(ContentExtractor.extract("http://localhost.localdomain/")).resolves.toBeNull();
    });

    test("blocks redirects exceeding hop limit", async () => {
      const result = await ContentExtractor.extract(
        "http://example.com/chain",
        4 // exceeds MAX_REDIRECTS = 3
      );
      expect(result).toBeNull();
    });

    test("blocks malformed URLs", async () => {
      await expect(ContentExtractor.extract("not a url")).resolves.toBeNull();
      await expect(ContentExtractor.extract("")).resolves.toBeNull();
    });
  });

  describe("ALLOW_PRIVATE override", () => {
    const ORIG = process.env.RESEARCH_ALLOW_PRIVATE_NETWORKS;

    beforeEach(() => {
      jest.resetModules();
    });

    afterEach(() => {
      process.env.RESEARCH_ALLOW_PRIVATE_NETWORKS = ORIG;
    });

    test("allows private IPs when RESEARCH_ALLOW_PRIVATE_NETWORKS=true", async () => {
      process.env.RESEARCH_ALLOW_PRIVATE_NETWORKS = "true";

      const { ContentExtractor: PermissiveExtractor } = require("../../../utils/research/contentExtractor");

      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => "text/plain" },
        text: jest.fn().mockResolvedValue("OK"),
        body: {
          getReader() {
            let done = false;
            return {
              read() {
                if (done) return Promise.resolve({ done: true, value: undefined });
                done = true;
                return Promise.resolve({ done: false, value: new TextEncoder().encode("OK") });
              },
              cancel() {},
              releaseLock() {},
            };
          },
        },
      });

      const result = await PermissiveExtractor.extract("http://127.0.0.1:3000/test");
      expect(result).toBe("OK");

      global.fetch = originalFetch;
    });
  });
});
