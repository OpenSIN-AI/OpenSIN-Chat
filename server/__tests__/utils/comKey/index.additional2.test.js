// SPDX-License-Identifier: MIT
// Additional tests for CommunicationKey. Covers RSA key size, signature
// determinism, encryption determinism, log method, and the constructor's
// behaviour with both fresh and pre-existing keypair files.
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const os = require("os");

// Isolate this test's comkey storage from other Jest workers AND from
// concurrent `yarn test` shells. Without an isolated base, parallel workers
// race on the same <repo>/server/storage/comkey directory: one worker's
// afterAll wipe steals another worker's keys mid-suite (ENOENT on
// ipc-{priv,pub}.pem), and two concurrent top-level fs.rmSync calls collide
// with ENOTEMPTY in CommunicationKey.#generate(). mkdtempSync gives each
// process a unique fresh base directory.
process.env.STORAGE_DIR = fs.mkdtempSync(
  path.join(os.tmpdir(), "opensin-comkey-"),
);

const { getStoragePath } = require("../../../utils/paths");

// Real storage path = <STORAGE_DIR>/comkey — same path comKey/index.js
// resolves via getStoragePath("comkey"). We ensure it exists, freshly
// empty, before requiring comKey so #generate() writes into the same dir.
const realStoragePath = getStoragePath("comkey");
if (fs.existsSync(realStoragePath)) {
  fs.rmSync(realStoragePath, { recursive: true, force: true });
}
fs.mkdirSync(realStoragePath, { recursive: true });

const { CommunicationKey } = require("../../../utils/comKey");

describe("CommunicationKey — additional2", () => {
  let key;

  beforeAll(() => {
    key = new CommunicationKey(true);
  });

  afterAll(() => {
    if (fs.existsSync(realStoragePath)) {
      fs.rmSync(realStoragePath, { recursive: true, force: true });
    }
  });

  describe("constructor", () => {
    it("stores the generated priv and pub keys as PKCS1 PEM", () => {
      const priv = fs.readFileSync(path.join(realStoragePath, "ipc-priv.pem"), "utf-8");
      const pub = fs.readFileSync(path.join(realStoragePath, "ipc-pub.pem"), "utf-8");
      // PKCS1 PEM header is "-----BEGIN RSA PRIVATE KEY-----"
      expect(priv).toContain("BEGIN RSA PRIVATE KEY");
      // PKCS1 public-key PEM header is "-----BEGIN RSA PUBLIC KEY-----"
      expect(pub).toContain("BEGIN RSA PUBLIC KEY");
    });

    it("the generated private key is parseable as an RSA private key", () => {
      const priv = fs.readFileSync(path.join(realStoragePath, "ipc-priv.pem"));
      const parsed = crypto.createPrivateKey(priv);
      expect(parsed.asymmetricKeyType).toBe("rsa");
    });

    it("the generated public key is parseable as an RSA public key", () => {
      const pub = fs.readFileSync(path.join(realStoragePath, "ipc-pub.pem"));
      const parsed = crypto.createPublicKey(pub);
      expect(parsed.asymmetricKeyType).toBe("rsa");
    });

    it("the generated private key has a 2048-bit modulus", () => {
      const priv = fs.readFileSync(path.join(realStoragePath, "ipc-priv.pem"));
      const parsed = crypto.createPrivateKey(priv);
      const details = parsed.asymmetricKeyDetails || {};
      // modulusLength is reported in bits
      expect(details.modulusLength).toBe(2048);
    });

    it("constructor without argument does NOT regenerate keys", () => {
      const before = fs.readFileSync(path.join(realStoragePath, "ipc-priv.pem"));
      // eslint-disable-next-line no-new
      new CommunicationKey();
      const after = fs.readFileSync(path.join(realStoragePath, "ipc-priv.pem"));
      expect(before.equals(after)).toBe(true);
    });

    it("constructor with generate=false leaves the existing keys untouched", () => {
      const before = fs.readFileSync(path.join(realStoragePath, "ipc-priv.pem"));
      // eslint-disable-next-line no-new
      new CommunicationKey(false);
      const after = fs.readFileSync(path.join(realStoragePath, "ipc-priv.pem"));
      expect(before.equals(after)).toBe(true);
    });
  });

  describe("sign — additional checks", () => {
    it("signature length is exactly 512 hex chars (2048-bit RSA)", () => {
      const sig = key.sign("data");
      // 2048-bit RSA signature = 256 bytes = 512 hex chars
      expect(sig.length).toBe(512);
    });

    it("a null/undefined input does not throw and returns a signature of empty input", () => {
      // The default parameter is "", so passing nothing signs "".
      const sig = key.sign();
      expect(typeof sig).toBe("string");
      expect(sig.length).toBe(512);
    });

    it("signing the same data twice with the same key yields the same signature (RSA-SHA256 is deterministic)", () => {
      const a = key.sign("deterministic-input");
      const b = key.sign("deterministic-input");
      expect(a).toBe(b);
    });

    it("signing different data of the same length still produces different signatures", () => {
      const a = key.sign("aaaaaa");
      const b = key.sign("bbbbbb");
      expect(a).not.toBe(b);
    });

    it("public key can verify a signature produced with a different data string after re-signing", () => {
      const data = "verify-me-twice";
      const sig = key.sign(data);
      const pubKey = fs.readFileSync(path.join(realStoragePath, "ipc-pub.pem"));
      // First verification
      expect(
        crypto.verify("RSA-SHA256", Buffer.from(data), pubKey, Buffer.from(sig, "hex"))
      ).toBe(true);
      // Re-sign, verify again
      const sig2 = key.sign(data);
      expect(sig2).toBe(sig);
      expect(
        crypto.verify("RSA-SHA256", Buffer.from(data), pubKey, Buffer.from(sig2, "hex"))
      ).toBe(true);
    });
  });

  describe("encrypt — additional checks", () => {
    it("encrypted output is base64 (round-trips through Buffer.from with base64)", () => {
      const enc = key.encrypt("plain");
      const buf = Buffer.from(enc, "base64");
      // base64 string with valid content round-trips; just check it parses
      expect(buf.length).toBeGreaterThan(0);
    });

    it("encrypted output length corresponds to 2048-bit RSA ciphertext (256 bytes => 344 base64 chars)", () => {
      const enc = key.encrypt("any-plain");
      const buf = Buffer.from(enc, "base64");
      expect(buf.length).toBe(256);
    });

    it("encrypt is deterministic for the same plaintext + same key", () => {
      const a = key.encrypt("repeat-me");
      const b = key.encrypt("repeat-me");
      expect(a).toBe(b);
    });

    it("public-decrypt recovers the original plaintext", () => {
      const original = "roundtrip-via-pubdecrypt";
      const enc = key.encrypt(original);
      const pubKey = fs.readFileSync(path.join(realStoragePath, "ipc-pub.pem"));
      const dec = crypto.publicDecrypt(pubKey, Buffer.from(enc, "base64"));
      expect(dec.toString("utf-8")).toBe(original);
    });

    it("public-decrypt fails when ciphertext is tampered with", () => {
      const enc = key.encrypt("tamper-target");
      const buf = Buffer.from(enc, "base64");
      // Flip a bit in the middle of the ciphertext
      buf[100] ^= 0x01;
      const pubKey = fs.readFileSync(path.join(realStoragePath, "ipc-pub.pem"));
      expect(() => crypto.publicDecrypt(pubKey, buf)).toThrow();
    });

    it("handles a payload near RSA-encryption size limit (small payload of 200 bytes)", () => {
      const payload = "x".repeat(200);
      const enc = key.encrypt(payload);
      const pubKey = fs.readFileSync(path.join(realStoragePath, "ipc-pub.pem"));
      const dec = crypto.publicDecrypt(pubKey, Buffer.from(enc, "base64"));
      expect(dec.toString("utf-8")).toBe(payload);
    });
  });

  describe("log method", () => {
    it("does not throw when called", () => {
      const spy = jest.spyOn(console, "log").mockImplementation();
      expect(() => key.log("hello %s", "world")).not.toThrow();
      expect(spy).toHaveBeenCalledTimes(1);
      const callArgs = spy.mock.calls[0];
      expect(typeof callArgs[0]).toBe("string");
      expect(callArgs[0]).toContain("CommunicationKey");
      spy.mockRestore();
    });

    it("handles no-args invocation", () => {
      const spy = jest.spyOn(console, "log").mockImplementation();
      expect(() => key.log("just a message")).not.toThrow();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe("error scenarios", () => {
    it("sign throws or fails gracefully if the storage dir is removed", () => {
      // Temporarily move storage out of the way
      const tmp = path.resolve(realStoragePath, "..", "comkey-tmp");
      fs.renameSync(realStoragePath, tmp);
      try {
        expect(() => key.sign("after-rename")).toThrow();
      } finally {
        fs.renameSync(tmp, realStoragePath);
      }
    });

    it("encrypt throws or fails gracefully if the storage dir is removed", () => {
      const tmp = path.resolve(realStoragePath, "..", "comkey-tmp-enc");
      fs.renameSync(realStoragePath, tmp);
      try {
        expect(() => key.encrypt("after-rename")).toThrow();
      } finally {
        fs.renameSync(tmp, realStoragePath);
      }
    });
  });

  describe("filesystem effects of constructor(generate=true)", () => {
    it("creates the storage directory if it does not exist", () => {
      // Remove and re-generate
      fs.rmSync(realStoragePath, { recursive: true, force: true });
      // eslint-disable-next-line no-new
      new CommunicationKey(true);
      expect(fs.existsSync(realStoragePath)).toBe(true);
      expect(fs.existsSync(path.join(realStoragePath, "ipc-priv.pem"))).toBe(true);
      expect(fs.existsSync(path.join(realStoragePath, "ipc-pub.pem"))).toBe(true);
    });
  });
});
