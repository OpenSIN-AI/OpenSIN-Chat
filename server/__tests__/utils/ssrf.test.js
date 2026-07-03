// SPDX-License-Identifier: MIT
const {
  validateUrl,
  isPrivateIPv4,
  isPrivateIPv6,
  safeFetch,
} = require("../../utils/ssrf");

describe("ssrf", () => {
  describe("isPrivateIPv4", () => {
    test("returns true for 10.x.x.x", () => {
      expect(isPrivateIPv4("10.0.0.1")).toBe(true);
    });

    test("returns true for 172.16.x.x", () => {
      expect(isPrivateIPv4("172.16.0.1")).toBe(true);
    });

    test("returns true for 172.31.x.x", () => {
      expect(isPrivateIPv4("172.31.255.255")).toBe(true);
    });

    test("returns false for 172.15.x.x (outside range)", () => {
      expect(isPrivateIPv4("172.15.0.1")).toBe(false);
    });

    test("returns false for 172.32.x.x (outside range)", () => {
      expect(isPrivateIPv4("172.32.0.1")).toBe(false);
    });

    test("returns true for 192.168.x.x", () => {
      expect(isPrivateIPv4("192.168.1.1")).toBe(true);
    });

    test("returns true for 127.x.x.x (loopback)", () => {
      expect(isPrivateIPv4("127.0.0.1")).toBe(true);
    });

    test("returns true for 169.254.x.x (link-local)", () => {
      expect(isPrivateIPv4("169.254.1.1")).toBe(true);
    });

    test("returns true for 0.0.0.0", () => {
      expect(isPrivateIPv4("0.0.0.0")).toBe(true);
    });

    test("returns true for 100.64.x.x (CGNAT)", () => {
      expect(isPrivateIPv4("100.64.0.1")).toBe(true);
    });

    test("returns true for 198.18.x.x (benchmark)", () => {
      expect(isPrivateIPv4("198.18.0.1")).toBe(true);
    });

    test("returns false for public IP", () => {
      expect(isPrivateIPv4("8.8.8.8")).toBe(false);
    });

    test("returns false for 1.1.1.1", () => {
      expect(isPrivateIPv4("1.1.1.1")).toBe(false);
    });

    test("returns false for non-IPv4 string", () => {
      expect(isPrivateIPv4("example.com")).toBe(false);
    });

    test("returns false for empty string", () => {
      expect(isPrivateIPv4("")).toBe(false);
    });

    test("returns false for IPv6 address", () => {
      expect(isPrivateIPv4("::1")).toBe(false);
    });
  });

  describe("isPrivateIPv6", () => {
    test("returns true for ::1 (loopback)", () => {
      expect(isPrivateIPv6("::1")).toBe(true);
    });

    test("returns true for fc00:: (unique local)", () => {
      expect(isPrivateIPv6("fc00::1")).toBe(true);
    });

    test("returns true for fd00:: (unique local)", () => {
      expect(isPrivateIPv6("fd12:3456::1")).toBe(true);
    });

    test("returns false for public IPv6", () => {
      expect(isPrivateIPv6("2606:4700::1")).toBe(false);
    });

    test("returns false for non-IPv6 string", () => {
      expect(isPrivateIPv6("example.com")).toBe(false);
    });

    test("returns false for IPv4 address", () => {
      expect(isPrivateIPv6("8.8.8.8")).toBe(false);
    });

    test("returns true for bracketed loopback [::1]", () => {
      expect(isPrivateIPv6("[::1]")).toBe(true);
    });

    test("returns true for hex-form IPv4-mapped loopback (::ffff:7f00:1)", () => {
      expect(isPrivateIPv6("::ffff:7f00:1")).toBe(true);
      expect(isPrivateIPv6("[::ffff:7f00:1]")).toBe(true);
    });

    test("returns true for dotted IPv4-mapped private (::ffff:192.168.0.1)", () => {
      expect(isPrivateIPv6("::ffff:192.168.0.1")).toBe(true);
    });

    test("returns true for link-local fe80::", () => {
      expect(isPrivateIPv6("fe80::1")).toBe(true);
    });
  });

  describe("validateUrl", () => {
    test("accepts a valid HTTPS URL", () => {
      const parsed = validateUrl("https://example.com/path");
      expect(parsed.hostname).toBe("example.com");
      expect(parsed.protocol).toBe("https:");
    });

    test("accepts a valid HTTP URL", () => {
      const parsed = validateUrl("http://example.com");
      expect(parsed.hostname).toBe("example.com");
    });

    test("throws on invalid URL string", () => {
      expect(() => validateUrl("not-a-url")).toThrow("Invalid URL");
    });

    test("throws on empty string", () => {
      expect(() => validateUrl("")).toThrow("Invalid URL");
    });

    test("throws on ftp protocol", () => {
      expect(() => validateUrl("ftp://example.com")).toThrow(
        "Invalid protocol",
      );
    });

    test("throws on file protocol", () => {
      expect(() => validateUrl("file:///etc/passwd")).toThrow(
        "Invalid protocol",
      );
    });

    test("throws on localhost", () => {
      expect(() => validateUrl("http://localhost/admin")).toThrow(
        "Internal URLs not allowed",
      );
    });

    test("throws on localhost.localdomain", () => {
      expect(() => validateUrl("http://localhost.localdomain/admin")).toThrow(
        "Internal URLs not allowed",
      );
    });

    test("throws on .local domain", () => {
      expect(() => validateUrl("http://my-service.local")).toThrow(
        "Internal URLs not allowed",
      );
    });

    test("throws on 127.0.0.1", () => {
      expect(() => validateUrl("http://127.0.0.1/admin")).toThrow(
        "Internal URLs not allowed",
      );
    });

    test("throws on 10.x.x.x", () => {
      expect(() => validateUrl("http://10.0.0.1/internal")).toThrow(
        "Internal URLs not allowed",
      );
    });

    test("throws on 192.168.x.x", () => {
      expect(() => validateUrl("http://192.168.1.1")).toThrow(
        "Internal URLs not allowed",
      );
    });

    test("throws on 169.254.x.x (metadata)", () => {
      expect(() => validateUrl("http://169.254.169.254/latest/meta-data")).toThrow(
        "Internal URLs not allowed",
      );
    });

    test("throws on 0.0.0.0", () => {
      expect(() => validateUrl("http://0.0.0.0")).toThrow(
        "Internal URLs not allowed",
      );
    });

    test("throws on IPv6 loopback [::1]", () => {
      expect(() => validateUrl("http://[::1]/admin")).toThrow(
        "Internal URLs not allowed",
      );
    });

    test("throws on hex-form IPv4-mapped loopback", () => {
      expect(() => validateUrl("http://[::ffff:7f00:1]/")).toThrow(
        "Internal URLs not allowed",
      );
    });

    test("throws on dotted IPv4-mapped loopback", () => {
      expect(() => validateUrl("http://[::ffff:127.0.0.1]/")).toThrow(
        "Internal URLs not allowed",
      );
    });

    test("throws on IPv6 link-local", () => {
      expect(() => validateUrl("http://[fe80::1]/")).toThrow(
        "Internal URLs not allowed",
      );
    });

    test("accepts public IPv6 literal", () => {
      const parsed = validateUrl("http://[2606:4700:4700::1111]/");
      expect(parsed.protocol).toBe("http:");
    });

    test("accepts public domain URL with port", () => {
      const parsed = validateUrl("https://example.com:8080/api");
      expect(parsed.hostname).toBe("example.com");
      expect(parsed.port).toBe("8080");
    });

    test("accepts URL with query parameters", () => {
      const parsed = validateUrl("https://example.com/search?q=test&page=1");
      expect(parsed.hostname).toBe("example.com");
    });
  });

  describe("safeFetch", () => {
    const originalFetch = global.fetch;
    afterEach(() => {
      global.fetch = originalFetch;
    });

    function mockResponse({ status = 200, location = null } = {}) {
      return {
        status,
        headers: { get: (name) => (name === "location" ? location : null) },
      };
    }

    test("rejects an initial internal URL before any fetch", async () => {
      global.fetch = jest.fn();
      await expect(safeFetch("http://169.254.169.254/latest")).rejects.toThrow(
        "Internal URLs not allowed",
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test("forces manual redirect handling", async () => {
      global.fetch = jest.fn().mockResolvedValue(mockResponse({ status: 200 }));
      await safeFetch("https://example.com");
      expect(global.fetch).toHaveBeenCalledWith(
        "https://example.com/",
        expect.objectContaining({ redirect: "manual" }),
      );
    });

    test("returns the final response after a safe redirect", async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce(
          mockResponse({ status: 302, location: "https://elsewhere.com/final" }),
        )
        .mockResolvedValueOnce(mockResponse({ status: 200 }));
      const res = await safeFetch("https://example.com");
      expect(res.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test("blocks a redirect that points to an internal address", async () => {
      global.fetch = jest.fn().mockResolvedValueOnce(
        mockResponse({
          status: 302,
          location: "http://169.254.169.254/latest/meta-data",
        }),
      );
      await expect(safeFetch("https://example.com")).rejects.toThrow(
        "Internal URLs not allowed",
      );
    });

    test("blocks a redirect to localhost", async () => {
      global.fetch = jest.fn().mockResolvedValueOnce(
        mockResponse({ status: 301, location: "http://127.0.0.1/admin" }),
      );
      await expect(safeFetch("https://example.com")).rejects.toThrow(
        "Internal URLs not allowed",
      );
    });

    test("throws after exceeding the max redirect count", async () => {
      global.fetch = jest.fn().mockResolvedValue(
        mockResponse({ status: 302, location: "https://example.com/loop" }),
      );
      await expect(
        safeFetch("https://example.com", {}, { maxRedirects: 2 }),
      ).rejects.toThrow("Too many redirects");
    });
  });
});
