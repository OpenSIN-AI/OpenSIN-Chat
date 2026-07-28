// SPDX-License-Identifier: MIT

const { isAllowedMutatingOrigin } = require("../../../utils/request/origin");

describe("isAllowedMutatingOrigin", () => {
  test("allows the same host across TLS-terminating proxy schemes", () => {
    expect(
      isAllowedMutatingOrigin({
        origin: "https://sinchat.delqhi.com",
        requestHost: "sinchat.delqhi.com",
      }),
    ).toBe(true);
  });

  test("preserves exact port matching", () => {
    expect(
      isAllowedMutatingOrigin({
        origin: "https://example.test:8443",
        requestHost: "example.test:8443",
      }),
    ).toBe(true);
    expect(
      isAllowedMutatingOrigin({
        origin: "https://example.test:8443",
        requestHost: "example.test",
      }),
    ).toBe(false);
  });

  test("allows an explicitly configured foreign origin", () => {
    expect(
      isAllowedMutatingOrigin({
        origin: "https://console.example.test",
        requestHost: "api.example.test",
        explicitOrigins: ["https://console.example.test"],
      }),
    ).toBe(true);
  });

  test.each([
    "https://evil.example",
    "https://sinchat.delqhi.com.evil.example",
    "https://sinchat.delqhi.com@evil.example",
    "javascript:alert(1)",
    "not a URL",
  ])("blocks an untrusted or malformed origin: %s", (origin) => {
    expect(
      isAllowedMutatingOrigin({
        origin,
        requestHost: "sinchat.delqhi.com",
      }),
    ).toBe(false);
  });
});
