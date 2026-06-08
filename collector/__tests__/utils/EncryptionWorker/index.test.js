// SPDX-License-Identifier: MIT
/* eslint-env jest, node */

const crypto = require("crypto");
const { EncryptionWorker } = require("../../../utils/EncryptionWorker");

function makeValidKey() {
  return crypto.randomBytes(32).toString("base64");
}

describe("EncryptionWorker", () => {
  let worker;
  const validKey = makeValidKey();

  beforeEach(() => {
    worker = new EncryptionWorker(validKey);
  });

  describe("constructor", () => {
    it("creates an instance with the provided base64 key", () => {
      expect(worker.key).toBeInstanceOf(Buffer);
      expect(worker.algorithm).toBe("aes-256-cbc");
      expect(worker.separator).toBe(":");
    });

    it("creates an instance with an empty key string", () => {
      const emptyWorker = new EncryptionWorker("");
      expect(emptyWorker.key).toBeInstanceOf(Buffer);
    });
  });

  describe("encrypt / decrypt round-trip", () => {
    it("encrypts and decrypts a string correctly", () => {
      const plain = "Hello, world!";
      const encrypted = worker.encrypt(plain);
      expect(encrypted).not.toBe(plain);
      expect(typeof encrypted).toBe("string");
      expect(encrypted).toContain(worker.separator);

      const decrypted = worker.decrypt(encrypted);
      expect(decrypted).toBe(plain);
    });

    it("encrypts and decrypts a JSON string", () => {
      const plain = JSON.stringify({ key: "value", num: 42 });
      const encrypted = worker.encrypt(plain);
      const decrypted = worker.decrypt(encrypted);
      expect(decrypted).toBe(plain);
    });

    it("produces different ciphertext for the same input (random IV)", () => {
      const plain = "same input";
      const e1 = worker.encrypt(plain);
      const e2 = worker.encrypt(plain);
      expect(e1).not.toBe(e2);
    });
  });

  describe("encrypt", () => {
    it("returns null for null input", () => {
      expect(worker.encrypt(null)).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(worker.encrypt("")).toBeNull();
    });

    it("returns null for undefined input", () => {
      expect(worker.encrypt(undefined)).toBeNull();
    });

    it("returns a string with separator between encrypted and IV", () => {
      const result = worker.encrypt("test data");
      const parts = result.split(":");
      expect(parts.length).toBe(2);
      expect(parts[0].length).toBeGreaterThan(0);
      expect(parts[1].length).toBeGreaterThan(0);
    });
  });

  describe("decrypt", () => {
    it("returns null for invalid encrypted string", () => {
      expect(worker.decrypt("garbage")).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(worker.decrypt("")).toBeNull();
    });

    it("returns null when IV is missing", () => {
      const encrypted = worker.encrypt("test");
      const withoutIv = encrypted.split(":")[0];
      expect(worker.decrypt(withoutIv)).toBeNull();
    });

    it("returns null when using a different key", () => {
      const encrypted = worker.encrypt("secret");
      const otherWorker = new EncryptionWorker(makeValidKey());
      expect(otherWorker.decrypt(encrypted)).toBeNull();
    });
  });

  describe("expandPayload", () => {
    it("returns the URL unchanged when no payload param exists", () => {
      const url = "https://example.com/path?a=1";
      const result = worker.expandPayload(url);
      expect(result.toString()).toContain("a=1");
      expect(result.searchParams.has("payload")).toBe(false);
    });

    it("decrypts payload and expands it into query params", () => {
      const innerParams = JSON.stringify({ token: "abc123", mode: "fast" });
      const encrypted = worker.encrypt(innerParams);
      const url = `https://example.com/api?payload=${encodeURIComponent(encrypted)}`;
      const result = worker.expandPayload(url);
      expect(result.searchParams.has("payload")).toBe(false);
      expect(result.searchParams.get("token")).toBe("abc123");
      expect(result.searchParams.get("mode")).toBe("fast");
    });

    it("throws for invalid URL input", () => {
      expect(() => worker.expandPayload("not-a-url")).toThrow();
    });

    it("returns a URL object when payload decryption fails but URL is valid", () => {
      const url = "https://example.com/api?payload=invalidencdata";
      const result = worker.expandPayload(url);
      expect(result).toBeInstanceOf(URL);
      expect(result.hostname).toBe("example.com");
    });
  });
});
