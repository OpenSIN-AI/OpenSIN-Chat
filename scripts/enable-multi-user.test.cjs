// SPDX-License-Identifier: MIT
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  passwordComplexityOptions,
  resolvePasswordHash,
  validateBcryptHash,
  validateRole,
  validateUsername,
} = require("./enable-multi-user.cjs");

test("accepts valid application usernames", () => {
  assert.equal(validateUsername("admin"), "admin");
  assert.equal(validateUsername("jeremy.schulze"), "jeremy.schulze");
});

test("rejects SQL-like or invalid usernames", () => {
  assert.throws(
    () => validateUsername("admin'; DROP TABLE users;--"),
    /Username must start/,
  );

  assert.throws(() => validateUsername("Admin"), /Username must start/);
  assert.throws(() => validateUsername("a"), /between 2 and 32/);
});

test("accepts only application roles", () => {
  assert.equal(validateRole("admin"), "admin");
  assert.equal(validateRole("manager"), "manager");
  assert.equal(validateRole("default"), "default");

  assert.throws(() => validateRole("root"), /Invalid role/);
});

test("requires one explicit credential source", () => {
  assert.throws(
    () => resolvePasswordHash({}, {}),
    /Missing credentials/,
  );

  assert.throws(
    () =>
      resolvePasswordHash(
        {
          OPEN_SIN_CHAT_PASSWORD: "a-secure-password",
          OPEN_SIN_CHAT_HASHED_PASSWORD:
            "$2b$12$123456789012345678901u12345678901234567890123456789012",
        },
        {},
      ),
    /Set only one credential source/,
  );
});

test("accepts a structurally valid bcrypt hash", () => {
  const hash =
    "$2b$12$123456789012345678901V1234567890123456789012345678901";

  assert.equal(validateBcryptHash(hash), hash);
  assert.equal(
    resolvePasswordHash({
      OPEN_SIN_CHAT_HASHED_PASSWORD: hash,
    }),
    hash,
  );
});

test("hashes an explicit plaintext password with cost 12", () => {
  let receivedOptions;
  let receivedPassword;
  let receivedCost;

  const password = "correct-horse-battery-staple";

  const hash = resolvePasswordHash(
    {
      OPEN_SIN_CHAT_PASSWORD: password,
    },
    {
      passwordComplexity: (options) => {
        receivedOptions = options;
        return {
          validate: (value) => ({
            value,
          }),
        };
      },
      bcrypt: {
        hashSync: (value, cost) => {
          receivedPassword = value;
          receivedCost = cost;
          return "mocked-bcrypt-hash";
        },
      },
    },
  );

  assert.equal(hash, "mocked-bcrypt-hash");
  assert.equal(receivedPassword, password);
  assert.equal(receivedCost, 12);
  assert.equal(receivedOptions.min, 12);
});

test("administrative password minimum cannot drop below 12", () => {
  assert.equal(
    passwordComplexityOptions({
      PASSWORDMINCHAR: "8",
    }).min,
    12,
  );

  assert.equal(
    passwordComplexityOptions({
      PASSWORDMINCHAR: "18",
    }).min,
    18,
  );
});
