// SPDX-License-Identifier: MIT
const crypto = require("crypto");

// Class that is used to arbitrarily encrypt/decrypt string data via a persistent passphrase/salt that
// is either user defined or is created and saved to the ENV on creation.
class EncryptionManager {
  #keyENV = "SIG_KEY";
  #saltENV = "SIG_SALT";
  #encryptionKey;
  #encryptionSalt;

  constructor({ key = null, salt = null } = {}) {
    this.#loadOrCreateKeySalt(key, salt);
    this.key = crypto.scryptSync(this.#encryptionKey, this.#encryptionSalt, 32);
    this.algorithm = "aes-256-gcm";
    this.separator = ":";

    // Used to send key to collector process to be able to decrypt data since they do not share ENVs
    // this value should use the CommunicationKey.encrypt process before sending anywhere outside the
    // server process so it is never sent in its raw format.
    this.xPayload = this.key.toString("base64");
  }

  log(text, ...args) {
    // eslint-disable-next-line no-console
    console.log(`\x1b[36m[EncryptionManager]\x1b[0m ${text}`, ...args);
  }

  #loadOrCreateKeySalt(_key = null, _salt = null) {
    if (!!_key && !!_salt) {
      this.log(
        "Pre-assigned key & salt for encrypting arbitrary data was used.",
      );
      this.#encryptionKey = _key;
      this.#encryptionSalt = _salt;
      return;
    }

    if (!process.env[this.#keyENV] || !process.env[this.#saltENV]) {
      this.log("Self-assigning key & salt for encrypting arbitrary data.");
      process.env[this.#keyENV] = crypto.randomBytes(32).toString("hex");
      process.env[this.#saltENV] = crypto.randomBytes(32).toString("hex");
      const { dumpENV } = require("../helpers/updateENV");
      dumpENV();
    } else
      this.log("Loaded existing key & salt for encrypting arbitrary data.");

    this.#encryptionKey = process.env[this.#keyENV];
    this.#encryptionSalt = process.env[this.#saltENV];
    return;
  }

  encrypt(plainTextString = null) {
    try {
      if (!plainTextString)
        throw new Error("Empty string is not valid for this method.");
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      const encrypted = Buffer.concat([
        cipher.update(plainTextString, "utf8"),
        cipher.final(),
      ]);
      const authTag = cipher.getAuthTag();
      return Buffer.concat([iv, authTag, encrypted]).toString("base64");
    } catch (e) {
      this.log(e);
      return null;
    }
  }

  decrypt(encryptedString) {
    try {
      const data = Buffer.from(encryptedString, "base64");
      const iv = data.subarray(0, 12);
      const authTag = data.subarray(12, 28);
      const encrypted = data.subarray(28);
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);
      return (
        decipher.update(encrypted, undefined, "utf8") + decipher.final("utf8")
      );
    } catch (e) {
      this.log(e);
      return null;
    }
  }
}

module.exports = { EncryptionManager };
