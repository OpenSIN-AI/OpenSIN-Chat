// SPDX-License-Identifier: MIT
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const { getStoragePath } = require("../../../utils/paths");

// The module is at server/utils/comKey/index.js
// getStoragePath("comkey") resolves to <repo>/server/storage/comkey in dev.
// We need to ensure that directory exists before the module is required.
const realStoragePath = getStoragePath("comkey");
if (fs.existsSync(realStoragePath)) {
  fs.rmSync(realStoragePath, { recursive: true, force: true });
}
fs.mkdirSync(realStoragePath, { recursive: true });

const { CommunicationKey } = require("../../../utils/comKey");

describe("CommunicationKey", () => {
  let key;

  beforeAll(() => {
    // Generate key pair before tests
    key = new CommunicationKey(true);
  });

  afterAll(() => {
    // Clean up the storage dir we created
    if (fs.existsSync(realStoragePath)) {
      fs.rmSync(realStoragePath, { recursive: true, force: true });
    }
  });

  describe("constructor", () => {
    test("generates RSA key pair when generate=true", () => {
      expect(fs.existsSync(path.join(realStoragePath, "ipc-priv.pem"))).toBe(true);
      expect(fs.existsSync(path.join(realStoragePath, "ipc-pub.pem"))).toBe(true);
    });

    test("does not regenerate when generate=false", () => {
      const initialPriv = fs.readFileSync(path.join(realStoragePath, "ipc-priv.pem"));
      const k2 = new CommunicationKey(false);
      const afterPriv = fs.readFileSync(path.join(realStoragePath, "ipc-priv.pem"));
      expect(initialPriv.equals(afterPriv)).toBe(true);
    });
  });

  describe("sign", () => {
    test("returns hex string", () => {
      const sig = key.sign("test data");
      expect(typeof sig).toBe("string");
      expect(sig).toMatch(/^[0-9a-f]+$/);
    });

    test("produces different signatures for different data", () => {
      const sig1 = key.sign("data1");
      const sig2 = key.sign("data2");
      expect(sig1).not.toBe(sig2);
    });

    test("produces same signature for same data", () => {
      const sig1 = key.sign("same data");
      const sig2 = key.sign("same data");
      expect(sig1).toBe(sig2);
    });

    test("signature is verifiable with public key", () => {
      const data = "important data";
      const sig = key.sign(data);
      const pubKey = fs.readFileSync(path.join(realStoragePath, "ipc-pub.pem"));
      const verified = crypto.verify(
        "RSA-SHA256",
        Buffer.from(data),
        pubKey,
        Buffer.from(sig, "hex")
      );
      expect(verified).toBe(true);
    });

    test("signature verification fails for tampered data", () => {
      const sig = key.sign("original data");
      const pubKey = fs.readFileSync(path.join(realStoragePath, "ipc-pub.pem"));
      const verified = crypto.verify(
        "RSA-SHA256",
        Buffer.from("tampered data"),
        pubKey,
        Buffer.from(sig, "hex")
      );
      expect(verified).toBe(false);
    });

    test("handles empty string", () => {
      const sig = key.sign("");
      expect(typeof sig).toBe("string");
    });
  });

  describe("encrypt", () => {
    test("returns base64 string", () => {
      const encrypted = key.encrypt("secret");
      expect(typeof encrypted).toBe("string");
      // Base64 regex
      expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+$/);
    });

    test("produces consistent ciphertext for same plaintext", () => {
      const enc1 = key.encrypt("same secret");
      const enc2 = key.encrypt("same secret");
      // RSA with PKCS1 v1.5 padding is deterministic, so the result is consistent
      expect(enc1).toBe(enc2);
    });

    test("encrypted data can be decrypted with public key", () => {
      const original = "my secret message";
      const encrypted = key.encrypt(original);
      const pubKey = fs.readFileSync(path.join(realStoragePath, "ipc-pub.pem"));
      const decrypted = crypto.publicDecrypt(pubKey, Buffer.from(encrypted, "base64"));
      expect(decrypted.toString("utf-8")).toBe(original);
    });

    test("handles empty string", () => {
      const encrypted = key.encrypt("");
      expect(typeof encrypted).toBe("string");
    });

    test("handles unicode characters", () => {
      const original = "Über die AfD — Größe!";
      const encrypted = key.encrypt(original);
      const pubKey = fs.readFileSync(path.join(realStoragePath, "ipc-pub.pem"));
      const decrypted = crypto.publicDecrypt(pubKey, Buffer.from(encrypted, "base64"));
      expect(decrypted.toString("utf-8")).toBe(original);
    });
  });
});
