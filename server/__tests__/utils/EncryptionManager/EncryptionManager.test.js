// SPDX-License-Identifier: MIT
const { EncryptionManager } = require("../../../utils/EncryptionManager");

jest.mock("../../../utils/helpers/updateENV", () => ({
  dumpENV: jest.fn(),
}));

describe("EncryptionManager", () => {
  let manager;

  beforeEach(() => {
    manager = new EncryptionManager({
      key: "test-key-value-at-least-16-chars",
      salt: "test-salt-value-at-least-16-chars",
    });
  });

  describe("encrypt", () => {
    it("returns a non-empty string", () => {
      const encrypted = manager.encrypt("hello world");
      expect(typeof encrypted).toBe("string");
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it("returns different values for different inputs", () => {
      const enc1 = manager.encrypt("first value");
      const enc2 = manager.encrypt("second value");
      expect(enc1).not.toBe(enc2);
    });

    it("returns different ciphertext for same input (random IV)", () => {
      const enc1 = manager.encrypt("same input");
      const enc2 = manager.encrypt("same input");
      expect(enc1).not.toBe(enc2);
    });

    it("returns null for null input", () => {
      expect(manager.encrypt(null)).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(manager.encrypt("")).toBeNull();
    });

    it("returns null for falsy input", () => {
      expect(manager.encrypt(0)).toBeNull();
      expect(manager.encrypt(false)).toBeNull();
    });

    it("produces output containing the separator character", () => {
      const encrypted = manager.encrypt("test data");
      expect(encrypted).toContain(manager.separator);
    });

    it("produces two hex segments separated by colon", () => {
      const encrypted = manager.encrypt("test data");
      const parts = encrypted.split(manager.separator);
      expect(parts.length).toBe(2);
      expect(parts[0].length).toBeGreaterThan(0);
      expect(parts[1].length).toBeGreaterThan(0);
    });
  });

  describe("decrypt", () => {
    it("reverses encrypt", () => {
      const original = "hello world";
      const encrypted = manager.encrypt(original);
      const decrypted = manager.decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it("handles special characters in round-trip", () => {
      const original = "üöä ß € © ® 🎉 \n\t\r";
      const decrypted = manager.decrypt(manager.encrypt(original));
      expect(decrypted).toBe(original);
    });

    it("handles long strings in round-trip", () => {
      const original = "a".repeat(10000);
      const decrypted = manager.decrypt(manager.encrypt(original));
      expect(decrypted).toBe(original);
    });

    it("returns null for invalid encrypted string", () => {
      expect(manager.decrypt("not-valid-encrypted")).toBeNull();
    });

    it("returns null when IV is missing", () => {
      expect(manager.decrypt("noivhere")).toBeNull();
    });

    it("returns null for null input", () => {
      expect(manager.decrypt(null)).toBeNull();
    });
  });

  describe("encrypt/decrypt round-trip", () => {
    it("preserves unicode text", () => {
      const original = "日本語テスト 中文测试 한국어";
      expect(manager.decrypt(manager.encrypt(original))).toBe(original);
    });

    it("preserves JSON strings", () => {
      const original = '{"key":"value","nested":{"a":1}}';
      expect(manager.decrypt(manager.encrypt(original))).toBe(original);
    });

    it("preserves base64 data", () => {
      const original = Buffer.from("binary data here").toString("base64");
      expect(manager.decrypt(manager.encrypt(original))).toBe(original);
    });
  });

  describe("constructor", () => {
    it("sets algorithm to aes-256-cbc", () => {
      expect(manager.algorithm).toBe("aes-256-cbc");
    });

    it("sets separator to colon", () => {
      expect(manager.separator).toBe(":");
    });

    it("sets xPayload to a base64 string", () => {
      expect(typeof manager.xPayload).toBe("string");
      expect(() => Buffer.from(manager.xPayload, "base64")).not.toThrow();
    });

    it("generates a 32-byte key via scrypt", () => {
      expect(manager.key).toBeInstanceOf(Buffer);
      expect(manager.key.length).toBe(32);
    });

    it("uses provided key and salt", () => {
      const m = new EncryptionManager({ key: "mykey12345678901", salt: "mysalt1234567890" });
      expect(m.key).toBeInstanceOf(Buffer);
      expect(m.key.length).toBe(32);
    });

    it("managers with same key/salt can decrypt each other's data", () => {
      const m1 = new EncryptionManager({ key: "shared-key-value1", salt: "shared-salt-val1" });
      const m2 = new EncryptionManager({ key: "shared-key-value1", salt: "shared-salt-val1" });
      const encrypted = m1.encrypt("cross-instance test");
      expect(m2.decrypt(encrypted)).toBe("cross-instance test");
    });

    it("managers with different key/salt cannot decrypt each other's data", () => {
      const m1 = new EncryptionManager({ key: "key-one-value-123", salt: "salt-one-val-123" });
      const m2 = new EncryptionManager({ key: "key-two-value-456", salt: "salt-two-val-456" });
      const encrypted = m1.encrypt("secret data");
      expect(m2.decrypt(encrypted)).toBeNull();
    });
  });
});
