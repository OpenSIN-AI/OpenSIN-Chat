// SPDX-License-Identifier: MIT
jest.mock("../../../utils/helpers/updateENV", () => ({
  dumpENV: jest.fn(),
}));

const { EncryptionManager } = require("../../../utils/EncryptionManager");
const crypto = require("crypto");

describe("EncryptionManager — additional edge cases", () => {
  const key = "additional-test-key-16ch";
  const salt = "additional-test-salt16";
  let manager;

  beforeEach(() => {
    manager = new EncryptionManager({ key, salt });
  });

  describe("encrypt", () => {
    it("handles whitespace-only strings as valid input", () => {
      const encrypted = manager.encrypt("   ");
      expect(encrypted).not.toBeNull();
      expect(manager.decrypt(encrypted)).toBe("   ");
    });

    it("handles strings with exactly one character", () => {
      const encrypted = manager.encrypt("a");
      expect(encrypted).not.toBeNull();
      expect(manager.decrypt(encrypted)).toBe("a");
    });

    it("handles strings that contain the separator character in plaintext", () => {
      const original = "part1:part2:part3";
      const encrypted = manager.encrypt(original);
      expect(manager.decrypt(encrypted)).toBe(original);
    });

    it("handles strings with null bytes", () => {
      const original = "before\0after";
      const encrypted = manager.encrypt(original);
      expect(manager.decrypt(encrypted)).toBe(original);
    });

    it("handles very long strings without truncation", () => {
      const original = "x".repeat(100000);
      const encrypted = manager.encrypt(original);
      expect(manager.decrypt(encrypted)).toBe(original);
    });

    it("returns null for undefined input", () => {
      expect(manager.encrypt(undefined)).toBeNull();
    });

    it("returns null for numeric zero input", () => {
      expect(manager.encrypt(0)).toBeNull();
    });

    it("IV is exactly 12 bytes (16-byte authTag follows)", () => {
      const encrypted = manager.encrypt("check-iv-length");
      const buf = Buffer.from(encrypted, "base64");
      // 12-byte IV + 16-byte authTag + at least 0 bytes ciphertext
      expect(buf.length).toBeGreaterThanOrEqual(28);
    });

    it("ciphertext segment is valid base64", () => {
      const encrypted = manager.encrypt("check-cipher-base64");
      expect(() => Buffer.from(encrypted, "base64")).not.toThrow();
      expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+$/);
    });
  });

  describe("decrypt", () => {
    it("returns null for empty string input", () => {
      expect(manager.decrypt("")).toBeNull();
    });

    it("returns null for malformed base64 input", () => {
      // contains chars outside the base64 alphabet — Buffer-from will throw
      expect(() => manager.decrypt("!!!not-base64!!!")).not.toThrow();
      expect(manager.decrypt("!!!not-base64!!!")).toBeNull();
    });

    it("returns null for payload shorter than IV+authTag (28 bytes)", () => {
      // 20 bytes of base64 random — too short for the 12-byte IV + 16-byte authTag
      expect(manager.decrypt(Buffer.alloc(20).toString("base64"))).toBeNull();
    });

    it("returns null when authTag fails to verify (tampered ciphertext)", () => {
      const encrypted = manager.encrypt("secret");
      const buf = Buffer.from(encrypted, "base64");
      // Flip a byte in the ciphertext region to break the GCM auth tag
      buf[buf.length - 1] ^= 0xff;
      expect(manager.decrypt(buf.toString("base64"))).toBeNull();
    });

    it("returns null for ciphertext encrypted with wrong key", () => {
      const other = new EncryptionManager({ key: "different-key-16ch", salt: "different-salt16" });
      const encrypted = other.encrypt("secret");
      expect(manager.decrypt(encrypted)).toBeNull();
    });
  });

  describe("xPayload", () => {
    it("is consistent across instances with same key/salt", () => {
      const m2 = new EncryptionManager({ key, salt });
      expect(manager.xPayload).toBe(m2.xPayload);
    });

    it("differs across instances with different key/salt", () => {
      const m2 = new EncryptionManager({ key: "other-key-16chars!", salt: "other-salt-16cha!" });
      expect(manager.xPayload).not.toBe(m2.xPayload);
    });

    it("can be decoded back to the raw key bytes", () => {
      const decoded = Buffer.from(manager.xPayload, "base64");
      expect(decoded.equals(manager.key)).toBe(true);
    });
  });

  describe("constructor — ENV auto-generation", () => {
    it("auto-generates SIG_KEY and SIG_SALT when not provided or in ENV", () => {
      const origKey = process.env.SIG_KEY;
      const origSalt = process.env.SIG_SALT;
      delete process.env.SIG_KEY;
      delete process.env.SIG_SALT;
      const m = new EncryptionManager();
      expect(process.env.SIG_KEY).toBeDefined();
      expect(process.env.SIG_SALT).toBeDefined();
      expect(process.env.SIG_KEY.length).toBeGreaterThan(0);
      expect(process.env.SIG_SALT.length).toBeGreaterThan(0);
      process.env.SIG_KEY = origKey;
      process.env.SIG_SALT = origSalt;
    });

    it("reuses existing ENV values when present", () => {
      process.env.SIG_KEY = "env-key-12345678901234";
      process.env.SIG_SALT = "env-salt-1234567890123";
      const m = new EncryptionManager();
      expect(m.xPayload).toBeDefined();
      delete process.env.SIG_KEY;
      delete process.env.SIG_SALT;
    });
  });

  describe("log", () => {
    it("does not throw when called", () => {
      const spy = jest.spyOn(console, "log").mockImplementation();
      expect(() => manager.log("test message")).not.toThrow();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe("round-trip stability", () => {
    it("100 sequential encrypt/decrypt cycles are all consistent", () => {
      for (let i = 0; i < 100; i++) {
        const original = "iteration-" + i + "-rand-" + Math.random();
        const decrypted = manager.decrypt(manager.encrypt(original));
        expect(decrypted).toBe(original);
      }
    });
  });
});
