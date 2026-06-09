// SPDX-License-Identifier: MIT
const { EncryptionManager } = require("../../../utils/EncryptionManager");

describe("EncryptionManager", () => {
  let manager;

  beforeEach(() => {
    manager = new EncryptionManager({
      key: "test-key-12345678901234567890123456789012",
      salt: "test-salt-12345678901234567890123456789012",
    });
  });

  describe("constructor", () => {
    test("initializes with provided key and salt", () => {
      expect(manager.key).toBeDefined();
      expect(manager.key.length).toBe(32);
    });

    test("sets algorithm to aes-256-cbc", () => {
      expect(manager.algorithm).toBe("aes-256-cbc");
    });

    test("sets separator to colon", () => {
      expect(manager.separator).toBe(":");
    });

    test("sets xPayload as base64 of key", () => {
      expect(manager.xPayload).toBe(manager.key.toString("base64"));
    });
  });

  describe("encrypt", () => {
    test("encrypts a string and returns IV-separated string", () => {
      const result = manager.encrypt("Hello World");
      expect(result).toBeTruthy();
      expect(result).toContain(":");
      const [encrypted, iv] = result.split(":");
      expect(encrypted).toBeTruthy();
      expect(iv).toBeTruthy();
    });

    test("produces different IV for same plaintext", () => {
      const result1 = manager.encrypt("Same text");
      const result2 = manager.encrypt("Same text");
      const iv1 = result1.split(":")[1];
      const iv2 = result2.split(":")[1];
      expect(iv1).not.toBe(iv2);
    });

    test("returns null for empty string", () => {
      expect(manager.encrypt("")).toBeNull();
    });

    test("returns null for null input", () => {
      expect(manager.encrypt(null)).toBeNull();
    });

    test("encrypts special characters", () => {
      const result = manager.encrypt("Hello\nWorld\t!");
      expect(result).toBeTruthy();
      expect(result).toContain(":");
    });

    test("encrypts unicode characters", () => {
      const result = manager.encrypt("Über die AfD — Größe!");
      expect(result).toBeTruthy();
    });

    test("encrypts long strings", () => {
      const longString = "a".repeat(1000);
      const result = manager.encrypt(longString);
      expect(result).toBeTruthy();
    });
  });

  describe("decrypt", () => {
    test("decrypts an encrypted string back to original", () => {
      const original = "Hello World";
      const encrypted = manager.encrypt(original);
      const decrypted = manager.decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    test("decrypts unicode characters", () => {
      const original = "Über die AfD — Größe!";
      const encrypted = manager.encrypt(original);
      const decrypted = manager.decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    test("decrypts special characters", () => {
      const original = "Hello\nWorld\t!@#$%^&*()";
      const encrypted = manager.encrypt(original);
      const decrypted = manager.decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    test("decrypts long strings", () => {
      const original = "a".repeat(1000);
      const encrypted = manager.encrypt(original);
      const decrypted = manager.decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    test("returns null for invalid input without IV", () => {
      expect(manager.decrypt("invalid-no-iv")).toBeNull();
    });

    test("returns null for corrupted encrypted data", () => {
      expect(manager.decrypt("not-hex:00")).toBeNull();
    });

    test("returns null for empty string", () => {
      expect(manager.decrypt("")).toBeNull();
    });
  });

  describe("encrypt-decrypt round trip", () => {
    test("works for various strings", () => {
      const testStrings = [
        "simple",
        "with spaces",
        "with-dashes_and_underscores",
        "MixedCaseString",
        "1234567890",
        "!@#$%^&*()",
        "Über die AfD",
        "https://example.com/path?query=value",
        JSON.stringify({ foo: "bar", num: 42 }),
      ];
      testStrings.forEach((str) => {
        const encrypted = manager.encrypt(str);
        const decrypted = manager.decrypt(encrypted);
        expect(decrypted).toBe(str);
      });
    });

    test("different instances with same key/salt can decrypt each other's data", () => {
      const manager2 = new EncryptionManager({
        key: "test-key-12345678901234567890123456789012",
        salt: "test-salt-12345678901234567890123456789012",
      });
      const original = "Cross-instance test";
      const encrypted = manager.encrypt(original);
      const decrypted = manager2.decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    test("different salts produce incompatible encrypted data", () => {
      const manager2 = new EncryptionManager({
        key: "test-key-12345678901234567890123456789012",
        salt: "different-salt-123456789012345678901234",
      });
      const original = "Test";
      const encrypted = manager.encrypt(original);
      const decrypted = manager2.decrypt(encrypted);
      expect(decrypted).not.toBe(original);
    });
  });
});
