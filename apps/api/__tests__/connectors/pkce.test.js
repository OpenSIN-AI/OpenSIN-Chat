// SPDX-License-Identifier: MIT
// Purpose: Unit tests for PKCE helper + state store.
const { createPKCE, putState, takeState } = require("../../../server/utils/connectors/pkce");

describe("PKCE + State Store", () => {
  describe("createPKCE", () => {
    it("should generate verifier and challenge", () => {
      const { verifier, challenge } = createPKCE();
      expect(verifier).toBeDefined();
      expect(challenge).toBeDefined();
      expect(verifier.length).toBeGreaterThan(30);
      expect(challenge.length).toBeGreaterThan(30);
      expect(verifier).not.toBe(challenge);
    });

    it("should generate unique pairs each call", () => {
      const a = createPKCE();
      const b = createPKCE();
      expect(a.verifier).not.toBe(b.verifier);
      expect(a.challenge).not.toBe(b.challenge);
    });

    it("should produce base64url-encoded values (no +, /, =)", () => {
      const { verifier, challenge } = createPKCE();
      expect(verifier).not.toMatch(/[+/=]/);
      expect(challenge).not.toMatch(/[+/=]/);
    });
  });

  describe("State Store", () => {
    it("should store and retrieve state", () => {
      putState("state-123", { provider: "google", product: "gmail", userId: 1 });
      const retrieved = takeState("state-123");
      expect(retrieved).not.toBeNull();
      expect(retrieved.provider).toBe("google");
      expect(retrieved.product).toBe("gmail");
      expect(retrieved.userId).toBe(1);
    });

    it("should delete state after retrieval (one-time use)", () => {
      putState("state-once", { provider: "github" });
      const first = takeState("state-once");
      const second = takeState("state-once");
      expect(first).not.toBeNull();
      expect(second).toBeNull();
    });

    it("should return null for non-existent state", () => {
      const result = takeState("non-existent");
      expect(result).toBeNull();
    });
  });
});
