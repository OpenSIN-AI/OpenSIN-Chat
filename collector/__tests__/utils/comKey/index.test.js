// SPDX-License-Identifier: MIT
/* eslint-env jest, node */

jest.mock("../../../utils/paths", () => ({
  getStoragePath: jest.fn(() => "/fake/storage"),
}));

jest.mock("fs", () => ({
  readFileSync: jest.fn(),
}));

const crypto = require("crypto");
const fs = require("fs");
const { CommunicationKey } = require("../../../utils/comKey");

describe("CommunicationKey", () => {
  let comKey;
  let keyPair;

  beforeAll(() => {
    keyPair = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    fs.readFileSync.mockReturnValue(keyPair.publicKey);
    comKey = new CommunicationKey();
  });

  describe("verify", () => {
    it("returns true for a valid signature", () => {
      const data = "test data";
      const sign = crypto.createSign("RSA-SHA256");
      sign.update(data);
      sign.end();
      const signature = sign.sign(keyPair.privateKey, "hex");
      expect(comKey.verify(signature, data)).toBe(true);
    });

    it("returns true for a valid signature with object data", () => {
      const data = { key: "value" };
      const sign = crypto.createSign("RSA-SHA256");
      sign.update(JSON.stringify(data));
      sign.end();
      const signature = sign.sign(keyPair.privateKey, "hex");
      expect(comKey.verify(signature, data)).toBe(true);
    });

    it("returns false for an invalid signature", () => {
      expect(comKey.verify("badsignature", "test data")).toBe(false);
    });

    it("returns false for empty inputs", () => {
      expect(comKey.verify("", "")).toBe(false);
    });

    it("returns false when signature does not match data", () => {
      const sign = crypto.createSign("RSA-SHA256");
      sign.update("original data");
      sign.end();
      const signature = sign.sign(keyPair.privateKey, "hex");
      expect(comKey.verify(signature, "tampered data")).toBe(false);
    });
  });

  describe("decrypt", () => {
    it("decrypts data that was private-key encrypted", () => {
      const plaintext = "secret message";
      const encrypted = crypto.privateEncrypt(
        keyPair.privateKey,
        Buffer.from(plaintext)
      );
      const result = comKey.decrypt(encrypted.toString("base64"));
      expect(result).toBe(plaintext);
    });

    it("throws for invalid base64 input", () => {
      expect(() => comKey.decrypt("invalidbase64")).toThrow();
    });

    it("decrypts JSON data encrypted with the private key", () => {
      const plaintext = JSON.stringify({ token: "abc123" });
      const encrypted = crypto.privateEncrypt(
        keyPair.privateKey,
        Buffer.from(plaintext)
      );
      const result = comKey.decrypt(encrypted.toString("base64"));
      expect(JSON.parse(result)).toEqual({ token: "abc123" });
    });
  });
});
