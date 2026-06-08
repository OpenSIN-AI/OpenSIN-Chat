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

    it("IV segment is exactly 32 hex characters (16 bytes)", () => {
      const encrypted = manager.encrypt("check-iv-length");
      const [, iv] = encrypted.split(manager.separator);
      expect(iv.length).toBe(32);
      expect(iv).toMatch(/^[0-9a-f]+$/);
    });

    it("ciphertext segment is valid hex", () => {
      const encrypted = manager.encrypt("check-cipher-hex");
      const [cipher] = encrypted.split(manager.separator);
      expect(cipher).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe("decrypt", () => {
    it("returns null for empty string input", () => {
      expect(manager.decrypt("")).toBeNull();
    });

    it("returns null for string with separator but empty parts", () => {
      expect(manager.decrypt(":")).toBeNull();
    });

    it("returns null for string with separator but empty IV", () => {
      expect(manager.decrypt("somecipher:")).toBeNull();
    });

    it("returns null for string with separator but empty ciphertext", () => {
      expect(manager.decrypt(":someiv")).toBeNull();
    });

    it("returns null when given valid hex IV but garbled ciphertext", () => {
      const iv = crypto.randomBytes(16).toString("hex");
      expect(manager.decrypt("garbled-" + iv + ":" + iv)).toBeNull();
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
