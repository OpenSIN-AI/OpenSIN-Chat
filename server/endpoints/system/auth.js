// SPDX-License-Identifier: MIT
// Purpose: Authentication endpoints — token request, SSO, account recovery, password reset.
// Docs: server/endpoints/system.doc.md
const consoleLogger = require("../../utils/logger/console.js");

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { SystemSettings } = require("../../models/systemSettings");
const { User } = require("../../models/user");

let _dummyBcryptHash = null;
function getDummyBcryptHash() {
  if (!_dummyBcryptHash)
    _dummyBcryptHash = bcrypt.hashSync("timing-normalization-dummy", 10);
  return _dummyBcryptHash;
}
const { Telemetry } = require("../../models/telemetry");
const { EventLogs } = require("../../models/eventLogs");
const {
  reqBody,
  makeJWT,
  userFromSession,
  multiUserMode,
} = require("../../utils/http");
const { validatedRequest } = require("../../utils/middleware/validatedRequest");
const {
  isMultiUserSetup,
} = require("../../utils/middleware/multiUserProtected");
const { simpleRateLimit } = require("../../utils/middleware/simpleRateLimit");
const { getAuthTokenHash } = require("../../utils/middleware/validatedRequest");
const {
  simpleSSOEnabled,
  simpleSSOLoginDisabled,
} = require("../../utils/middleware/simpleSSOEnabled");
const { EncryptionManager } = require("../../utils/EncryptionManager");
const { TemporaryAuthToken } = require("../../models/temporaryAuthToken");
const {
  recoverAccount,
  resetPassword,
  generateRecoveryCodes,
} = require("../../utils/PasswordRecovery");

function authEndpoints(app) {
  if (!app) return;

  app.get(
    "/system/check-token",
    [validatedRequest],
    async (request, response) => {
      try {
        if (multiUserMode(response)) {
          const user = await userFromSession(request, response);
          if (!user || user.suspended) {
            response.sendStatus(403);
            return;
          }

          response.sendStatus(200);
          return;
        }

        response.sendStatus(200);
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  /**
   * Refreshes the user object from the session from a provided token.
   * This does not refresh the token itself - if that is expired or invalid, the user will be logged out.
   * This simply keeps the user object in sync with the database over the course of the session.
   * @returns {Promise<{success: boolean, user: Object | null, message: string | null}>}
   */
  app.get(
    "/system/refresh-user",
    [validatedRequest],
    async (request, response) => {
      try {
        if (!multiUserMode(response))
          return response
            .status(200)
            .json({ success: true, user: null, message: null });

        const user = await userFromSession(request, response);
        if (!user)
          return response.status(200).json({
            success: false,
            user: null,
            message: "Session expired or invalid.",
          });

        if (user.suspended)
          return response.status(200).json({
            success: false,
            user: null,
            message: "User is suspended.",
          });

        return response.status(200).json({
          success: true,
          user: User.filterFields(user),
          message: null,
        });
      } catch (e) {
        const errorId = crypto.randomUUID();
        consoleLogger.error(`[endpoint error ${errorId}]`, e);
        return response.status(500).json({
          success: false,
          user: null,
          message: "Internal server error",
          errorId,
        });
      }
    },
  );

  // In single-user no-password mode (no AUTH_TOKEN env var) the server
  // auto-grants a token with no credentials to check — rate limiting only
  // causes lockouts for the legitimate owner.  Skip both buckets in that case.
  const skipForSingleUserNoPassword = (request) => {
    if (process.env.AUTH_TOKEN) return false;
    const body = reqBody(request);
    return (
      !body ||
      (typeof body.username !== "string" && typeof body.password !== "string")
    );
  };

  app.post(
    "/request-token",
    [
      simpleRateLimit({
        bucket: "login-ip",
        max: 100,
        windowMs: 60 * 1000,
        identity: "user",
        skipIf: skipForSingleUserNoPassword,
      }),
      simpleRateLimit({
        bucket: "login-account",
        max: 100,
        windowMs: 60 * 60 * 1000,
        identity: "user",
        skipIf: skipForSingleUserNoPassword,
      }),
    ],
    async (request, response) => {
      try {
        const LOCKOUT_WINDOW_MS = 60 * 60 * 1000;

        if (await SystemSettings.isMultiUserMode()) {
          if (simpleSSOLoginDisabled()) {
            response.status(403).json({
              user: null,
              valid: false,
              token: null,
              message:
                "[005] Login via credentials has been disabled by the administrator.",
            });
            return;
          }

          const { username, password } = reqBody(request);
          if (!username || !password) {
            return response
              .status(400)
              .json({ error: "Username and password are required." });
          }
          const attempted = String(username);
          const usernameHash = crypto
            .createHash("sha256")
            .update(attempted)
            .digest("hex")
            .slice(0, 16);
          const uaRaw =
            request.headers && request.headers["user-agent"]
              ? request.headers["user-agent"]
              : null;
          const ua = uaRaw ? String(uaRaw).slice(0, 200) : null;
          const cfIp =
            (request.headers && request.headers["cf-connecting-ip"]) || null;
          const requestMeta = {
            ip: request.ip || "Unknown IP",
            userAgent: ua,
            cf_connecting_ip: cfIp,
          };
          const existingUser = await User._get({ username: attempted });

          if (!existingUser) {
            bcrypt.compareSync(String(password), getDummyBcryptHash());
            await EventLogs.logEvent(
              "failed_login_invalid_username",
              {
                ...requestMeta,
                username_hash: usernameHash,
              },
              existingUser?.id,
            );
            response.status(200).json({
              user: null,
              valid: false,
              token: null,
              message: "[001] Invalid login credentials.",
            });
            return;
          }

          if (await User.isLockedOut(existingUser)) {
            await EventLogs.logEvent(
              "failed_login_account_locked",
              {
                ...requestMeta,
                username_hash: usernameHash,
              },
              existingUser.id,
            );
            return response.status(423).json({
              user: null,
              valid: false,
              token: null,
              message:
                "Account temporarily locked due to repeated failed logins. Try again later.",
              retryAfterMs: LOCKOUT_WINDOW_MS,
            });
          }

          if (!bcrypt.compareSync(String(password), existingUser.password)) {
            await User.recordFailedLogin(existingUser.id);
            await EventLogs.logEvent(
              "failed_login_invalid_password",
              {
                ...requestMeta,
                username_hash: usernameHash,
              },
              existingUser?.id,
            );
            response.status(200).json({
              user: null,
              valid: false,
              token: null,
              message: "[001] Invalid login credentials.",
            });
            return;
          }

          await User.resetFailedLogins(existingUser.id);

          if (existingUser.suspended) {
            await EventLogs.logEvent(
              "failed_login_account_suspended",
              {
                ...requestMeta,
                username_hash: usernameHash,
              },
              existingUser?.id,
            );
            response.status(200).json({
              user: null,
              valid: false,
              token: null,
              message: "[004] Account suspended by admin.",
            });
            return;
          }

          await Telemetry.sendTelemetry(
            "login_event",
            { multiUserMode: true },
            existingUser?.id,
          );

          await EventLogs.logEvent(
            "login_event",
            {
              ...requestMeta,
              username: existingUser.username || "Unknown user",
            },
            existingUser?.id,
          );

          // Generate a session token for the user then check if they have seen the recovery codes
          // and if not, generate recovery codes and return them to the frontend.
          const sessionToken = makeJWT(
            { id: existingUser.id, username: existingUser.username },
            process.env.JWT_EXPIRY,
          );
          if (!existingUser.seen_recovery_codes) {
            const plainTextCodes = await generateRecoveryCodes(existingUser.id);
            response.status(200).json({
              valid: true,
              user: User.filterFields(existingUser),
              token: sessionToken,
              message: null,
              recoveryCodes: plainTextCodes,
            });
            return;
          }

          response.status(200).json({
            valid: true,
            user: User.filterFields(existingUser),
            token: sessionToken,
            message: null,
          });
          return;
        } else {
          const { password } = reqBody(request);
          const uaRaw =
            request.headers && request.headers["user-agent"]
              ? request.headers["user-agent"]
              : null;
          const ua = uaRaw ? String(uaRaw).slice(0, 200) : null;
          const cfIp =
            (request.headers && request.headers["cf-connecting-ip"]) || null;
          const singleRequestMeta = {
            ip: request.ip || "Unknown IP",
            multiUserMode: false,
            userAgent: ua,
            cf_connecting_ip: cfIp,
          };
          // Single-user mode WITHOUT an AUTH_TOKEN env var: auth is disabled.
          // Auto-grant a session token instead of crashing on
          // `bcrypt.hashSync(undefined, 10)`.
          if (!process.env.AUTH_TOKEN) {
            await Telemetry.sendTelemetry("login_event", {
              multiUserMode: false,
            });
            await EventLogs.logEvent("login_event", singleRequestMeta);
            response.status(200).json({
              valid: true,
              token: makeJWT({ p: null }, process.env.JWT_EXPIRY),
              message: null,
            });
            return;
          }
          if (!bcrypt.compareSync(password, getAuthTokenHash())) {
            await EventLogs.logEvent(
              "failed_login_invalid_password",
              singleRequestMeta,
            );
            response.status(401).json({
              valid: false,
              token: null,
              message: "[003] Invalid password provided",
            });
            return;
          }

          await Telemetry.sendTelemetry("login_event", {
            multiUserMode: false,
          });
          await EventLogs.logEvent("login_event", singleRequestMeta);
          response.status(200).json({
            valid: true,
            token: makeJWT(
              { p: new EncryptionManager().encrypt(String(password)) },
              process.env.JWT_EXPIRY,
            ),
            message: null,
          });
        }
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.get(
    "/request-token/sso/simple",
    [
      simpleSSOEnabled,
      simpleRateLimit({
        bucket: "sso-token",
        max: 10,
        windowMs: 15 * 60 * 1000,
      }),
    ],
    async (request, response) => {
      try {
        const { token: tempAuthToken } = request.query;
        const { sessionToken, token, error } =
          await TemporaryAuthToken.validate(tempAuthToken);

        if (error) {
          const uaRaw =
            request.headers && request.headers["user-agent"]
              ? request.headers["user-agent"]
              : null;
          const ua = uaRaw ? String(uaRaw).slice(0, 200) : null;
          const cfIp =
            (request.headers && request.headers["cf-connecting-ip"]) || null;
          await EventLogs.logEvent(
            "failed_login_invalid_temporary_auth_token",
            {
              ip: request.ip || "Unknown IP",
              multiUserMode: true,
              userAgent: ua,
              cf_connecting_ip: cfIp,
            },
          );
          return response.status(401).json({
            valid: false,
            token: null,
            message: `[001] An error occurred while validating the token: ${error}`,
          });
        }

        await Telemetry.sendTelemetry(
          "login_event",
          { multiUserMode: true },
          token.user.id,
        );
        await EventLogs.logEvent(
          "login_event",
          {
            ip: request.ip || "Unknown IP",
            username: token.user.username || "Unknown user",
            userAgent:
              request.headers && request.headers["user-agent"]
                ? String(request.headers["user-agent"]).slice(0, 200)
                : null,
            cf_connecting_ip:
              (request.headers && request.headers["cf-connecting-ip"]) || null,
          },
          token.user.id,
        );

        response.status(200).json({
          valid: true,
          user: User.filterFields(token.user),
          token: sessionToken,
          message: null,
        });
      } catch (e) {
        const errorId = crypto.randomUUID();
        consoleLogger.error(`[sso-simple FATAL id=${errorId}]`, e);
        return response.status(500).json({
          valid: false,
          token: null,
          message: `[002] Internal server error`,
          errorId,
        });
      }
    },
  );

  app.post(
    "/system/recover-account",
    [
      isMultiUserSetup,
      simpleRateLimit({
        bucket: "recover-account",
        max: 5,
        windowMs: 15 * 60 * 1000,
      }),
    ],
    async (request, response) => {
      try {
        const { username, recoveryCodes } = reqBody(request);
        const { success, resetToken, error } = await recoverAccount(
          username,
          recoveryCodes,
        );

        if (success) {
          response.status(200).json({ success, resetToken });
        } else {
          response.status(400).json({ success, message: error });
        }
      } catch (error) {
        consoleLogger.error("Error recovering account:", error);
        response
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }
    },
  );

  app.post(
    "/system/reset-password",
    [
      isMultiUserSetup,
      simpleRateLimit({
        bucket: "password-reset",
        max: 5,
        windowMs: 15 * 60 * 1000,
      }),
    ],
    async (request, response) => {
      try {
        const { token, newPassword, confirmPassword } = reqBody(request);
        const { success, message } = await resetPassword(
          token,
          newPassword,
          confirmPassword,
        );

        if (success) {
          response.status(200).json({ success, message });
        } else {
          // resetPassword returns { success, message } — not { success, error }.
          // Send `message` so the frontend can surface the actual error
          // (e.g. "Invalid reset token" or password complexity failure)
          // instead of a generic fallback.
          response.status(400).json({ success, message });
        }
      } catch (error) {
        consoleLogger.error("Error resetting password:", error);
        response
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }
    },
  );
}

module.exports = { authEndpoints };
