// SPDX-License-Identifier: MIT
const bcrypt = require("bcryptjs");
const { v4, validate } = require("uuid");
const { User } = require("../../models/user");
const {
  RecoveryCode,
  PasswordResetToken,
} = require("../../models/passwordRecovery");

let _dummyBcryptHash = null;
function getDummyBcryptHash() {
  if (!_dummyBcryptHash)
    _dummyBcryptHash = bcrypt.hashSync("timing-normalization-dummy", 12);
  return _dummyBcryptHash;
}

async function generateRecoveryCodes(userId) {
  // Delete any existing recovery codes before generating new ones.
  // Without this, old codes remain valid alongside the new ones, allowing
  // an attacker with an old code to recover the account.
  await RecoveryCode.deleteMany({ user_id: userId });

  const newRecoveryCodes = [];
  const plainTextCodes = [];
  for (let i = 0; i < 4; i++) {
    const code = v4();
    const hashedCode = bcrypt.hashSync(code, 12);
    newRecoveryCodes.push({
      user_id: userId,
      code_hash: hashedCode,
    });
    plainTextCodes.push(code);
  }

  const { error } = await RecoveryCode.createMany(newRecoveryCodes);
  if (!!error) throw new Error(error);

  const { user: success } = await User._update(userId, {
    seen_recovery_codes: true,
  });
  if (!success) throw new Error("Failed to generate user recovery codes!");

  return plainTextCodes;
}

async function recoverAccount(username = "", recoveryCodes = []) {
  const user = await User.get({ username: String(username) });
  if (!user) {
    bcrypt.compareSync("timing-normalization-dummy", getDummyBcryptHash());
    return { success: false, error: "Invalid recovery codes." };
  }

  // If hashes do not exist for a user
  // because this is a user who has not logged out and back in since upgrade.
  const allUserHashes = await RecoveryCode.hashesForUser(user.id);
  if (allUserHashes.length < 4)
    return { success: false, error: "Invalid recovery codes." };

  // Trim BEFORE deduplicating so that codes differing only by whitespace
  // (e.g. " abc " and "abc") are treated as the same code.  Previously the
  // Set deduplication ran before trim, allowing a single real code to be
  // submitted twice with different whitespace to bypass the 2-code check.
  const uniqueRecoveryCodes = [
    ...new Set(recoveryCodes.map((code) => String(code).trim())),
  ]
    .filter((code) => validate(code)) // we know that any provided code must be a uuid v4.
    .slice(0, 2);
  if (uniqueRecoveryCodes.length !== 2)
    return { success: false, error: "Invalid recovery codes." };

  const validCodes = uniqueRecoveryCodes.every((code) => {
    let valid = false;
    allUserHashes.forEach((hash) => {
      if (bcrypt.compareSync(code, hash)) valid = true;
    });
    return valid;
  });
  if (!validCodes) return { success: false, error: "Invalid recovery codes." };

  const { passwordResetToken, error } = await PasswordResetToken.create(
    user.id,
  );
  if (!!error) return { success: false, error };

  // Recovery codes are NOT deleted here — they are consumed in resetPassword
  // only after the password is successfully changed.  Previously they were
  // deleted here, which meant a failed resetPassword (e.g. complexity check)
  // would leave the user locked out with no codes and no usable reset token.

  return { success: true, resetToken: passwordResetToken.token };
}

async function resetPassword(token, _newPassword = "", confirmPassword = "") {
  const newPassword = String(_newPassword).trim(); // No spaces in passwords
  if (!newPassword) throw new Error("Invalid password.");
  if (newPassword !== String(confirmPassword))
    throw new Error("Passwords do not match");

  // Atomically claim the single-use reset token: delete only if it exists
  // and hasn't expired. If count === 0, a concurrent request already claimed
  // it or it expired — refuse to proceed (prevents TOCTOU race).
  const { count, userId } = await PasswordResetToken.claim(String(token));
  if (count === 0 || !userId) {
    return { success: false, message: "Invalid reset token" };
  }

  // JOI password rules will be enforced inside .update.
  const { error } = await User.update(userId, {
    password: newPassword,
  });

  if (error) return { success: false, message: error };

  // Password was successfully changed — now consume the recovery codes
  // and mark them as unseen so new codes are generated on next login.
  // seen_recovery_codes is not publicly writable so we do a direct update.
  await RecoveryCode.deleteMany({ user_id: userId });
  await User._update(userId, {
    seen_recovery_codes: false,
  });

  // Token was already atomically claimed above; clean up any remaining tokens.
  await PasswordResetToken.deleteMany({ user_id: userId });

  // New codes are provided on first new login.
  return { success: true, message: "Password reset successful" };
}

module.exports = {
  recoverAccount,
  resetPassword,
  generateRecoveryCodes,
};
