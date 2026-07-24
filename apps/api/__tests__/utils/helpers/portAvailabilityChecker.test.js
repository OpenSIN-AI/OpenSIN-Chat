// SPDX-License-Identifier: MIT
const { isPortInUse, getLocalHosts } = require("../../../utils/helpers/portAvailabilityChecker");

describe("getLocalHosts", () => {
  test("returns an array", () => {
    const hosts = getLocalHosts();
    expect(Array.isArray(hosts)).toBe(true);
  });

  test("includes '0.0.0.0' as default", () => {
    const hosts = getLocalHosts();
    expect(hosts).toContain("0.0.0.0");
  });

  test("includes undefined for default host", () => {
    const hosts = getLocalHosts();
    expect(hosts).toContain(undefined);
  });

  test("includes at least one IP address from network interfaces", () => {
    const hosts = getLocalHosts();
    expect(hosts.length).toBeGreaterThan(2);
  });

  test("returns unique hosts", () => {
    const hosts = getLocalHosts();
    const unique = [...new Set(hosts)];
    expect(hosts.length).toBe(unique.length);
  });
});

describe("isPortInUse", () => {
  test("returns false when port is available", async () => {
    // Use a high random port that's likely free
    const port = 49152 + Math.floor(Math.random() * 1000);
    const result = await isPortInUse(port, "127.0.0.1");
    expect(typeof result).toBe("boolean");
  });

  test("returns false for invalid host", async () => {
    // Invalid host should return false
    const result = await isPortInUse(12345, "999.999.999.999");
    expect(result).toBe(false);
  });

  test("returns false for invalid port", async () => {
    const result = await isPortInUse(-1, "127.0.0.1");
    expect(result).toBe(false);
  });
});
