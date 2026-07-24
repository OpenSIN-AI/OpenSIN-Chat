// SPDX-License-Identifier: MIT
const crypto = require("crypto");
const { EncryptionWorker } = require("../../../utils/EncryptionWorker");

describe("EncryptionWorker", () => {
  let worker;
  let base64Key;

  beforeAll(() => {
    // Generate a 32-byte key
    base64Key = crypto.randomBytes(32).toString("base64");
  });

  beforeEach(() => {
    worker = new EncryptionWorker(base64Key);
  });

  describe("constructor", () => {
    test("initializes with base64-decoded key", () => {
      expect(worker.key).toBeInstanceOf(Buffer);
      expect(worker.key.length).toBe(32);
    });

    test("sets algorithm to aes-256-cbc", () => {
      expect(worker.algorithm).toBe("aes-256-cbc");
    });

    test("sets separator to colon", () => {
      expect(worker.separator).toBe(":");
    });

    test("handles empty key", () => {
      const w = new EncryptionWorker("");
      expect(w.key).toBeInstanceOf(Buffer);
    });
  });

  describe("encrypt", () => {
    test("encrypts a string", () => {
      const result = worker.encrypt("Hello World");
      expect(result).toBeTruthy();
      expect(result).toContain(":");
    });

    test("produces different IV for same plaintext", () => {
      const r1 = worker.encrypt("Same text");
      const r2 = worker.encrypt("Same text");
      const iv1 = r1.split(":")[1];
      const iv2 = r2.split(":")[1];
      expect(iv1).not.toBe(iv2);
    });

    test("returns null for empty string", () => {
      expect(worker.encrypt("")).toBeNull();
    });

    test("returns null for null", () => {
      expect(worker.encrypt(null)).toBeNull();
    });

    test("encrypts unicode characters", () => {
      const result = worker.encrypt("Über die AfD");
      expect(result).toBeTruthy();
    });

    test("encrypts long strings", () => {
      const longStr = "a".repeat(1000);
      const result = worker.encrypt(longStr);
      expect(result).toBeTruthy();
    });
  });

  describe("decrypt", () => {
    test("decrypts an encrypted string", () => {
      const original = "Hello World";
      const encrypted = worker.encrypt(original);
      const decrypted = worker.decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    test("decrypts unicode characters", () => {
      const original = "Größe! Äpfel & Birnen";
      const encrypted = worker.encrypt(original);
      const decrypted = worker.decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    test("decrypts long strings", () => {
      const original = "a".repeat(1000);
      const encrypted = worker.encrypt(original);
      const decrypted = worker.decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    test("returns null for invalid input without IV", () => {
      expect(worker.decrypt("no-iv")).toBeNull();
    });

    test("returns null for empty string", () => {
      expect(worker.decrypt("")).toBeNull();
    });
  });

  describe("expandPayload", () => {
    test("returns URL as-is when no payload param", () => {
      const url = "https://example.com/page";
      const result = worker.expandPayload(url);
      expect(result.toString()).toContain("example.com");
    });

    test("expands payload query param", () => {
      const params = { foo: "bar", baz: "qux" };
      const encrypted = worker.encrypt(JSON.stringify(params));
      const url = `https://example.com/page?payload=${encodeURIComponent(encrypted)}`;
      const result = worker.expandPayload(url);
      expect(result.searchParams.get("foo")).toBe("bar");
      expect(result.searchParams.get("baz")).toBe("qux");
    });

    test("removes payload param after expansion", () => {
      const params = { foo: "bar" };
      const encrypted = worker.encrypt(JSON.stringify(params));
      const url = `https://example.com/page?payload=${encodeURIComponent(encrypted)}`;
      const result = worker.expandPayload(url);
      expect(result.searchParams.has("payload")).toBe(false);
    });

    test("handles invalid URL by throwing", () => {
      // The function doesn't gracefully handle invalid URLs - it throws
      // because the catch block logs but then re-throws at the return statement
      expect(() => worker.expandPayload("not a url")).toThrow();
    });

    test("handles invalid encrypted payload gracefully", () => {
      const url = "https://example.com/page?payload=invalid";
      const result = worker.expandPayload(url);
      expect(result).toBeInstanceOf(URL);
    });
  });

  describe("cross-instance encryption", () => {
    test("same key can decrypt across instances", () => {
      const worker2 = new EncryptionWorker(base64Key);
      const original = "test message";
      const encrypted = worker.encrypt(original);
      const decrypted = worker2.decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    test("different keys produce incompatible encrypted data", () => {
      const differentKey = crypto.randomBytes(32).toString("base64");
      const worker2 = new EncryptionWorker(differentKey);
      const original = "test";
      const encrypted = worker.encrypt(original);
      const decrypted = worker2.decrypt(encrypted);
      expect(decrypted).not.toBe(original);
    });
  });
});
