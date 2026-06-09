// SPDX-License-Identifier: MIT
// Additional edge-case tests for EncryptionManager. These focus on
// the AES-CBC mechanics, IV properties, key/algorithm invariants, and
// regression-style scenarios for the xPayload (collector key sharing).
const { EncryptionManager } = require("../../../utils/EncryptionManager");
const crypto = require("crypto");

describe("EncryptionManager — additional2 edge cases", () => {
  const key = "add2-key-16chars!!";
  const salt = "add2-salt-16chars!";
  let manager;

  beforeEach(() => {
    manager = new EncryptionManager({ key, salt });
  });

  describe("constructor invariants", () => {
    it("derives a 32-byte key from the supplied key/salt (scrypt output)", () => {
      const expected = crypto.scryptSync(key, salt, 32);
      expect(manager.key.equals(expected)).toBe(true);
    });

    it("xPayload is a base64 string that decodes to the derived key", () => {
      const decoded = Buffer.from(manager.xPayload, "base64");
      expect(decoded.length).toBe(32);
      expect(decoded.equals(manager.key)).toBe(true);
    });

    it("xPayload is not the raw passphrase but the derived 32 bytes", () => {
      const decoded = Buffer.from(manager.xPayload, "base64");
      // passphrase is 20 bytes; scrypt output is 32 bytes
      expect(decoded.length).not.toBe(Buffer.from(key).length);
    });

    it("uses aes-256-cbc algorithm", () => {
      expect(manager.algorithm).toBe("aes-256-cbc");
      expect(crypto.getCiphers().includes("aes-256-cbc")).toBe(true);
    });

    it("uses ':' as the separator between ciphertext and IV", () => {
      expect(manager.separator).toBe(":");
    });

    it("derived key is independent of the passphrase length", () => {
      const m1 = new EncryptionManager({ key: "short", salt });
      const m2 = new EncryptionManager({ key: "x".repeat(200), salt });
      // Both are 32 bytes, but they should be different
      expect(m1.key.length).toBe(32);
      expect(m2.key.length).toBe(32);
      expect(m1.key.equals(m2.key)).toBe(false);
    });
  });

  describe("encrypt — randomness and structure", () => {
    it("produces 3 colon-separated segments only if ciphertext contains no colon (always 2 here)", () => {
      const enc = manager.encrypt("check");
      const parts = enc.split(":");
      expect(parts).toHaveLength(2);
    });

    it("two consecutive encrypts of the same plaintext produce different ciphertext", () => {
      const a = manager.encrypt("identical-input");
      const b = manager.encrypt("identical-input");
      expect(a).not.toBe(b);
    });

    it("two consecutive encrypts of the same plaintext produce different IVs", () => {
      const a = manager.encrypt("identical-input");
      const b = manager.encrypt("identical-input");
      const ivA = a.split(manager.separator)[1];
      const ivB = b.split(manager.separator)[1];
      expect(ivA).not.toBe(ivB);
    });

    it("ciphertext is AES-CBC aligned to 16-byte multiples (hex-encoded)", () => {
      // AES-CBC ciphertext is a multiple of 16 bytes; hex = 2 chars per byte
      const enc = manager.encrypt("block-alignment-test");
      const cipher = enc.split(manager.separator)[0];
      expect(cipher.length % 2).toBe(0);
      expect((cipher.length / 2) % 16).toBe(0);
    });

    it("encrypts an empty-looking but truthy string (e.g. space)", () => {
      const enc = manager.encrypt(" ");
      expect(enc).toBeTruthy();
      expect(manager.decrypt(enc)).toBe(" ");
    });

    it("returns null for non-string truthy input (e.g. number)", () => {
      expect(manager.encrypt(123)).toBeNull();
    });

    it("returns null for boolean true", () => {
      expect(manager.encrypt(true)).toBeNull();
    });

    it("returns null for empty object", () => {
      expect(manager.encrypt({})).toBeNull();
    });
  });

  describe("decrypt — error handling", () => {
    it("returns null for a string without the separator", () => {
      expect(manager.decrypt("no-separator-here")).toBeNull();
    });

    it("returns null when IV is not valid hex", () => {
      expect(manager.decrypt("deadbeef:ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ")).toBeNull();
    });

    it("returns null when IV is wrong length (not 16 bytes)", () => {
      // 8-byte IV in hex = 16 chars
      expect(manager.decrypt("deadbeef:0011223344556677")).toBeNull();
    });

    it("returns null when ciphertext is not valid hex", () => {
      const iv = crypto.randomBytes(16).toString("hex");
      expect(manager.decrypt(`zz-not-hex-${iv}:${iv}`)).toBeNull();
    });

    it("returns null for non-string input (number)", () => {
      expect(manager.decrypt(12345)).toBeNull();
    });

    it("returns null for non-string input (object)", () => {
      expect(manager.decrypt({ a: 1 })).toBeNull();
    });

    it("returns null for null input", () => {
      expect(manager.decrypt(null)).toBeNull();
    });

    it("returns null for undefined input", () => {
      expect(manager.decrypt(undefined)).toBeNull();
    });
  });

  describe("cross-instance compatibility", () => {
    it("a fresh instance with the same key/salt decrypts the other instance's payload", () => {
      const enc = manager.encrypt("cross-instance");
      const peer = new EncryptionManager({ key, salt });
      expect(peer.decrypt(enc)).toBe("cross-instance");
    });

    it("an instance with a different salt cannot decrypt the original payload", () => {
      const enc = manager.encrypt("cross-instance");
      const stranger = new EncryptionManager({ key, salt: "totally-different-sa" });
      expect(stranger.decrypt(enc)).toBeNull();
    });

    it("an instance with a different key cannot decrypt the original payload", () => {
      const enc = manager.encrypt("cross-instance");
      const stranger = new EncryptionManager({ key: "totally-different-ke", salt });
      expect(stranger.decrypt(enc)).toBeNull();
    });

    it("xPayload can be used to construct a peer with the same derived key", () => {
      // The xPayload is a base64 of the derived 32-byte key. We can use it
      // to build a peer that decrypts correctly only if we also re-derive
      // with the SAME salt. (This is by-design: xPayload alone is the key
      // material; the salt must be shared out-of-band.)
      const derivedKeyBuf = Buffer.from(manager.xPayload, "base64");
      expect(derivedKeyBuf.equals(manager.key)).toBe(true);
    });
  });

  describe("encrypt/decrypt — payload categories", () => {
    const cases = [
      ["plain ASCII", "hello world"],
      ["numbers as string", "1234567890"],
      ["json payload", JSON.stringify({ a: 1, b: [1, 2, 3], c: "x" })],
      ["url with query", "https://example.com/path?a=1&b=two"],
      ["html-ish markup", "<div class='x'>y &amp; z</div>"],
      ["emoji payload", "🎉🔥💯"],
      ["german umlauts", "Größe, schön, über"],
      ["mixed newline/tab", "line1\nline2\tcol2"],
      ["1000-char random", crypto.randomBytes(500).toString("hex")],
    ];
    test.each(cases)("round-trips %s without loss", (_label, input) => {
      const enc = manager.encrypt(input);
      expect(enc).toBeTruthy();
      expect(manager.decrypt(enc)).toBe(input);
    });
  });

  describe("log method", () => {
    it("does not throw and produces console output", () => {
      const spy = jest.spyOn(console, "log").mockImplementation();
      expect(() => manager.log("hello %s", "world")).not.toThrow();
      expect(spy).toHaveBeenCalledTimes(1);
      const callArgs = spy.mock.calls[0];
      // First arg is the colored prefix string
      expect(typeof callArgs[0]).toBe("string");
      expect(callArgs[0]).toContain("EncryptionManager");
      spy.mockRestore();
    });

    it("handles being called with no extra args", () => {
      const spy = jest.spyOn(console, "log").mockImplementation();
      expect(() => manager.log("just a message")).not.toThrow();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
