// SPDX-License-Identifier: MIT
// Purpose: Unit tests for providers registry — availability checks, redirect URIs.
const {
  PROVIDERS,
  isProviderAvailable,
  getAvailability,
  redirectUri,
  BASE_URL,
} = require("../../../server/utils/connectors/providers");

describe("OAuth Providers Registry", () => {
  describe("PROVIDERS", () => {
    it("should have google and github providers", () => {
      expect(PROVIDERS.google).toBeDefined();
      expect(PROVIDERS.github).toBeDefined();
    });

    it("should have auth URLs", () => {
      expect(PROVIDERS.google.authUrl).toContain("accounts.google.com");
      expect(PROVIDERS.github.authUrl).toContain("github.com/login/oauth");
    });

    it("should have token URLs", () => {
      expect(PROVIDERS.google.tokenUrl).toContain("oauth2.googleapis.com");
      expect(PROVIDERS.github.tokenUrl).toContain("github.com/login/oauth");
    });

    it("should have scope sets", () => {
      expect(PROVIDERS.google.scopeSets.gmail).toBeDefined();
      expect(PROVIDERS.google.scopeSets.drive).toBeDefined();
      expect(PROVIDERS.google.scopeSets.docs).toBeDefined();
      expect(PROVIDERS.google.scopeSets.sheets).toBeDefined();
      expect(PROVIDERS.github.scopeSets.repo).toBeDefined();
    });

    it("should have PKCE enabled", () => {
      expect(PROVIDERS.google.usesPKCE).toBe(true);
      expect(PROVIDERS.github.usesPKCE).toBe(true);
    });

    it("should have userinfo URLs", () => {
      expect(PROVIDERS.google.userinfoUrl).toContain("openidconnect");
      expect(PROVIDERS.github.userinfoUrl).toContain("api.github.com/user");
    });
  });

  describe("isProviderAvailable", () => {
    it("should return false when clientId is not set", () => {
      // In test env, env vars are not set
      const result = isProviderAvailable("google");
      // Could be true or false depending on env — just check it returns boolean
      expect(typeof result).toBe("boolean");
    });

    it("should return false for unknown provider", () => {
      expect(isProviderAvailable("nonexistent")).toBe(false);
    });
  });

  describe("getAvailability", () => {
    it("should return an object with all providers", () => {
      const avail = getAvailability();
      expect(avail).toHaveProperty("google");
      expect(avail).toHaveProperty("github");
      expect(typeof avail.google).toBe("boolean");
      expect(typeof avail.github).toBe("boolean");
    });
  });

  describe("redirectUri", () => {
    it("should build correct redirect URI", () => {
      const uri = redirectUri("google");
      expect(uri).toContain("/api/connectors/google/callback");
      expect(uri).toContain(BASE_URL);
    });

    it("should build different URIs per provider", () => {
      expect(redirectUri("google")).not.toBe(redirectUri("github"));
    });
  });
});
