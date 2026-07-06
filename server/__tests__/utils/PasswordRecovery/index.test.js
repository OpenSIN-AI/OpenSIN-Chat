// SPDX-License-Identifier: MIT
/**
 * Tests for utils/PasswordRecovery (Issue #390).
 *
 * Security-critical flow: recovery-code generation, account recovery
 * (token issuance) and password reset (single-use token consumption).
 *
 * Covered:
 * - generateRecoveryCodes: old codes are invalidated, 4 new codes are
 *   created (hashed, never stored in plaintext), seen flag is set.
 * - recoverAccount: unknown user, missing hashes, whitespace/duplicate
 *   bypass protection, non-UUID rejection, wrong codes, success path,
 *   and that codes are NOT consumed before the password change.
 * - resetPassword: validation errors, invalid/expired/already-claimed
 *   token (single use), failed complexity check keeps codes intact,
 *   success path consumes codes and cleans up tokens.
 */

const bcrypt = require("bcryptjs");
const { v4 } = require("uuid");

jest.mock("../../../models/user", () => ({
  User: {
    get: jest.fn(),
    update: jest.fn(),
    _update: jest.fn(),
  },
}));

jest.mock("../../../models/passwordRecovery", () => ({
  RecoveryCode: {
    deleteMany: jest.fn().mockResolvedValue(true),
    createMany: jest.fn(),
    hashesForUser: jest.fn(),
  },
  PasswordResetToken: {
    create: jest.fn(),
    claim: jest.fn(),
    deleteMany: jest.fn().mockResolvedValue(true),
  },
}));

const { User } = require("../../../models/user");
const {
  RecoveryCode,
  PasswordResetToken,
} = require("../../../models/passwordRecovery");
const {
  generateRecoveryCodes,
  recoverAccount,
  resetPassword,
} = require("../../../utils/PasswordRecovery");

// Low bcrypt cost for test fixtures — compareSync works across costs.
const hash = (plain) => bcrypt.hashSync(plain, 4);

describe("generateRecoveryCodes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    RecoveryCode.createMany.mockResolvedValue({ error: null });
    User._update.mockResolvedValue({ user: { id: 1 } });
  });

  test("deletes existing codes before creating new ones", async () => {
    await generateRecoveryCodes(1);
    expect(RecoveryCode.deleteMany).toHaveBeenCalledWith({ user_id: 1 });
    // deleteMany must run before createMany so old codes cannot survive.
    expect(
      RecoveryCode.deleteMany.mock.invocationCallOrder[0],
    ).toBeLessThan(RecoveryCode.createMany.mock.invocationCallOrder[0]);
  });

  test("creates exactly 4 hashed codes and returns 4 plaintext UUIDs", async () => {
    const codes = await generateRecoveryCodes(1);
    expect(codes).toHaveLength(4);

    const stored = RecoveryCode.createMany.mock.calls[0][0];
    expect(stored).toHaveLength(4);
    stored.forEach((entry, i) => {
      expect(entry.user_id).toBe(1);
      // Never store plaintext.
      expect(entry.code_hash).not.toBe(codes[i]);
      // Stored hash must verify against the returned plaintext code.
      expect(bcrypt.compareSync(codes[i], entry.code_hash)).toBe(true);
    });
  });

  test("marks the user as having seen recovery codes", async () => {
    await generateRecoveryCodes(1);
    expect(User._update).toHaveBeenCalledWith(1, {
      seen_recovery_codes: true,
    });
  });

  test("throws when persisting codes fails", async () => {
    RecoveryCode.createMany.mockResolvedValue({ error: "db down" });
    await expect(generateRecoveryCodes(1)).rejects.toThrow("db down");
  });

  test("throws when the user flag update fails", async () => {
    User._update.mockResolvedValue({ user: null });
    await expect(generateRecoveryCodes(1)).rejects.toThrow(
      "Failed to generate user recovery codes!",
    );
  });
});

describe("recoverAccount", () => {
  const userId = 5;
  const codeA = v4();
  const codeB = v4();
  const codeC = v4();
  const codeD = v4();
  const allHashes = [hash(codeA), hash(codeB), hash(codeC), hash(codeD)];

  beforeEach(() => {
    jest.clearAllMocks();
    User.get.mockResolvedValue({ id: userId, username: "alice" });
    RecoveryCode.hashesForUser.mockResolvedValue(allHashes);
    PasswordResetToken.create.mockResolvedValue({
      passwordResetToken: { token: "reset-token-123" },
      error: null,
    });
  });

  test("rejects unknown users with a generic error", async () => {
    User.get.mockResolvedValue(null);
    const result = await recoverAccount("ghost", [codeA, codeB]);
    expect(result).toEqual({
      success: false,
      error: "Invalid recovery codes.",
    });
    expect(PasswordResetToken.create).not.toHaveBeenCalled();
  });

  test("rejects users without a full set of recovery hashes", async () => {
    RecoveryCode.hashesForUser.mockResolvedValue([hash(codeA)]);
    const result = await recoverAccount("alice", [codeA, codeB]);
    expect(result).toEqual({
      success: false,
      error: "Invalid recovery codes.",
    });
  });

  test("rejects a single code submitted twice with differing whitespace", async () => {
    // Whitespace-dedup bypass: " codeA " and "codeA" are the same code.
    const result = await recoverAccount("alice", [` ${codeA} `, codeA]);
    expect(result).toEqual({
      success: false,
      error: "Invalid recovery codes.",
    });
  });

  test("rejects non-UUID codes", async () => {
    const result = await recoverAccount("alice", ["not-a-uuid", codeA]);
    expect(result).toEqual({
      success: false,
      error: "Invalid recovery codes.",
    });
  });

  test("rejects two well-formed but wrong codes", async () => {
    const result = await recoverAccount("alice", [v4(), v4()]);
    expect(result).toEqual({
      success: false,
      error: "Invalid recovery codes.",
    });
    expect(PasswordResetToken.create).not.toHaveBeenCalled();
  });

  test("issues a reset token for two distinct valid codes", async () => {
    const result = await recoverAccount("alice", [codeA, codeB]);
    expect(result).toEqual({ success: true, resetToken: "reset-token-123" });
    expect(PasswordResetToken.create).toHaveBeenCalledWith(userId);
  });

  test("accepts valid codes with surrounding whitespace", async () => {
    const result = await recoverAccount("alice", [`  ${codeA}  `, codeB]);
    expect(result).toEqual({ success: true, resetToken: "reset-token-123" });
  });

  test("does NOT consume recovery codes on successful recovery", async () => {
    // Codes must only be consumed after a successful password change,
    // otherwise a failed resetPassword locks the user out permanently.
    await recoverAccount("alice", [codeA, codeB]);
    expect(RecoveryCode.deleteMany).not.toHaveBeenCalled();
  });

  test("propagates token-creation errors", async () => {
    PasswordResetToken.create.mockResolvedValue({
      passwordResetToken: null,
      error: "db error",
    });
    const result = await recoverAccount("alice", [codeA, codeB]);
    expect(result).toEqual({ success: false, error: "db error" });
  });
});

describe("resetPassword", () => {
  const userId = 5;

  beforeEach(() => {
    jest.clearAllMocks();
    PasswordResetToken.claim.mockResolvedValue({ count: 1, userId });
    User.update.mockResolvedValue({ error: null });
    User._update.mockResolvedValue({ user: { id: userId } });
  });

  test("throws on empty password", async () => {
    await expect(resetPassword("tok", "", "")).rejects.toThrow(
      "Invalid password.",
    );
    await expect(resetPassword("tok", "   ", "   ")).rejects.toThrow(
      "Invalid password.",
    );
  });

  test("throws when passwords do not match", async () => {
    await expect(
      resetPassword("tok", "newPass123", "different"),
    ).rejects.toThrow("Passwords do not match");
  });

  test("rejects an invalid or expired token", async () => {
    PasswordResetToken.claim.mockResolvedValue({ count: 0, userId: null });
    const result = await resetPassword("bad-token", "newPass123", "newPass123");
    expect(result).toEqual({ success: false, message: "Invalid reset token" });
    expect(User.update).not.toHaveBeenCalled();
  });

  test("rejects a token that was already claimed (single use)", async () => {
    // A concurrent request claimed the token first: count 0 despite userId.
    PasswordResetToken.claim.mockResolvedValue({ count: 0, userId });
    const result = await resetPassword("tok", "newPass123", "newPass123");
    expect(result).toEqual({ success: false, message: "Invalid reset token" });
    expect(User.update).not.toHaveBeenCalled();
  });

  test("keeps recovery codes intact when the password update fails", async () => {
    User.update.mockResolvedValue({ error: "Password too weak" });
    const result = await resetPassword("tok", "weak", "weak");
    expect(result).toEqual({ success: false, message: "Password too weak" });
    // Codes must survive a failed complexity check so the user can retry.
    expect(RecoveryCode.deleteMany).not.toHaveBeenCalled();
    expect(User._update).not.toHaveBeenCalled();
  });

  test("consumes recovery codes and tokens only after a successful reset", async () => {
    const result = await resetPassword("tok", "newPass123", "newPass123");
    expect(result).toEqual({
      success: true,
      message: "Password reset successful",
    });
    expect(User.update).toHaveBeenCalledWith(userId, {
      password: "newPass123",
    });
    expect(RecoveryCode.deleteMany).toHaveBeenCalledWith({ user_id: userId });
    expect(User._update).toHaveBeenCalledWith(userId, {
      seen_recovery_codes: false,
    });
    expect(PasswordResetToken.deleteMany).toHaveBeenCalledWith({
      user_id: userId,
    });
  });

  test("trims whitespace from the new password before storing", async () => {
    await resetPassword("tok", "  newPass123  ", "newPass123");
    expect(User.update).toHaveBeenCalledWith(userId, {
      password: "newPass123",
    });
  });
});
