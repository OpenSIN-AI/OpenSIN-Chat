// SPDX-License-Identifier: MIT
import React, { useState, useEffect } from "react";
import {
  User,
  Lock,
  Eye,
  EyeSlash,
  CircleNotch,
  ArrowLeft,
  Key,
} from "@phosphor-icons/react";
import System from "../../../models/system";
import { AUTH_TOKEN, AUTH_USER, RESET_TOKEN } from "../../../utils/constants";
import paths from "../../../utils/paths";
import showToast from "@/utils/toast";
import { safeGetItem, safeSetItem, safeRemoveItem } from "@/utils/safeStorage";
import ModalWrapper from "@/components/ModalWrapper";
import { useModal } from "@/hooks/useModal";
import RecoveryCodeModal from "@/components/Modals/DisplayRecoveryCodeModal";
import { useTranslation } from "react-i18next";
import useCustomAppName from "@/hooks/useCustomAppName";
import logger from "@/utils/logger";

/* Shared field styles so every input looks identical */
const FIELD_CLASS =
  "w-full h-12 rounded-xl border border-white/10 bg-zinc-800/60 light:bg-slate-100 light:border-slate-200 pl-11 pr-4 text-sm text-zinc-100 light:text-slate-900 placeholder:text-zinc-600 transition focus:outline-none focus:border-[#009ee0] focus:ring-2 focus:ring-[#009ee0]/30";
const LABEL_CLASS = "text-sm font-medium text-zinc-300 light:text-slate-700";
const PRIMARY_BTN_CLASS =
  "mt-2 flex h-12 w-full items-center justify-center gap-x-2 rounded-xl bg-[#009ee0] text-sm font-semibold text-white transition hover:bg-[#0089c4] focus:outline-none focus:ring-2 focus:ring-[#009ee0]/40 disabled:cursor-not-allowed disabled:opacity-60";
const LINK_BTN_CLASS =
  "flex items-center justify-center gap-x-1.5 text-sm text-zinc-400 light:text-slate-500 hover:text-[#009ee0] transition";

const RecoveryForm = ({ onSubmit, setShowRecoveryForm }) => {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [recoveryCodeInputs, setRecoveryCodeInputs] = useState(
    Array(2).fill(""),
  );

  const handleRecoveryCodeChange = (index, value) => {
    const updatedCodes = [...recoveryCodeInputs];
    updatedCodes[index] = value;
    setRecoveryCodeInputs(updatedCodes);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const recoveryCodes = recoveryCodeInputs.filter(
        (code) => code.trim() !== "",
      );
      await onSubmit(username, recoveryCodes);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col w-full">
      <div className="flex flex-col gap-y-2 mb-8">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-50 light:text-slate-900">
          {t("login.password-reset.title")}
        </h2>
        <p className="text-sm text-zinc-400 light:text-slate-500 leading-relaxed">
          {t("login.password-reset.description")}
        </p>
      </div>

      <div className="flex flex-col gap-y-4">
        <div className="flex flex-col gap-y-2">
          <label htmlFor="recovery-username" className={LABEL_CLASS}>
            {t("login.multi-user.placeholder-username")}
          </label>
          <div className="relative">
            <User
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
            />
            <input
              id="recovery-username"
              name="username"
              type="text"
              aria-label={t("auth.username")}
              className={FIELD_CLASS}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
        </div>

        <div className="flex flex-col gap-y-2">
          <label className={LABEL_CLASS}>
            {t("login.password-reset.recovery-codes")}
          </label>
          {/* index key OK: static list */}
          {recoveryCodeInputs.map((code, index) => (
            <div key={index} className="relative">
              <Key
                size={18}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
              />
              <input
                type="text"
                name={`recoveryCode${index + 1}`}
                aria-label={`${t("login.password-reset.recovery-codes")} ${
                  index + 1
                }`}
                className={FIELD_CLASS}
                value={code}
                onChange={(e) =>
                  handleRecoveryCodeChange(index, e.target.value)
                }
                required
                autoComplete="one-time-code"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-y-4">
        <button type="submit" disabled={loading} className={PRIMARY_BTN_CLASS}>
          {loading ? (
            <>
              <CircleNotch size={18} className="animate-spin" />
              {t("login.multi-user.validating")}
            </>
          ) : (
            t("login.password-reset.title")
          )}
        </button>
        <button
          type="button"
          className={LINK_BTN_CLASS}
          onClick={() => setShowRecoveryForm(false)}
        >
          <ArrowLeft size={16} />
          {t("login.password-reset.back-to-login")}
        </button>
      </div>
    </form>
  );
};

const ResetPasswordForm = ({ onSubmit }) => {
  const { t } = useTranslation();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(newPassword, confirmPassword);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col w-full">
      <div className="flex flex-col gap-y-2 mb-8">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-50 light:text-slate-900">
          {t("multiUserAuth.resetPassword.title")}
        </h2>
        <p className="text-sm text-zinc-400 light:text-slate-500 leading-relaxed">
          {t("multiUserAuth.resetPassword.description")}
        </p>
      </div>

      <div className="flex flex-col gap-y-4">
        <div className="flex flex-col gap-y-2">
          <label htmlFor="reset-newPassword" className={LABEL_CLASS}>
            {t("multiUserAuth.resetPassword.newPassword")}
          </label>
          <div className="relative">
            <Lock
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
            />
            <input
              id="reset-newPassword"
              type="password"
              name="newPassword"
              aria-label={t("auth.newPassword")}
              className={FIELD_CLASS}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="flex flex-col gap-y-2">
          <label htmlFor="reset-confirmPassword" className={LABEL_CLASS}>
            {t("multiUserAuth.resetPassword.confirmPassword")}
          </label>
          <div className="relative">
            <Lock
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
            />
            <input
              id="reset-confirmPassword"
              type="password"
              name="confirmPassword"
              aria-label={t("multiUserAuth.resetPassword.confirmPassword")}
              className={FIELD_CLASS}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
        </div>
      </div>

      <div className="mt-8">
        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className={PRIMARY_BTN_CLASS}
        >
          {loading ? (
            <>
              <CircleNotch size={18} className="animate-spin" />
              {t("login.multi-user.validating")}
            </>
          ) : (
            t("multiUserAuth.resetPassword.title")
          )}
        </button>
      </div>
    </form>
  );
};

export default function MultiUserAuth() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<any[]>([]);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<any>(null);
  const [showRecoveryForm, setShowRecoveryForm] = useState(false);
  const [showResetPasswordForm, setShowResetPasswordForm] = useState(false);

  const { appName, isLoading: appNameLoading } = useCustomAppName();

  const {
    isOpen: isRecoveryCodeModalOpen,
    openModal: openRecoveryCodeModal,
    closeModal: closeRecoveryCodeModal,
  } = useModal();

  const handleLogin = async (e) => {
    setError(null);
    setLoading(true);
    e.preventDefault();
    try {
      const data = {};
      const form = new FormData(e.target);
      for (const [key, value] of form.entries()) data[key] = value;
      const { valid, user, token, message, recoveryCodes } =
        await System.requestToken(data);
      if (valid && !!token && !!user) {
        setUser(user);
        setToken(token);

        if (recoveryCodes) {
          setRecoveryCodes(recoveryCodes);
          openRecoveryCodeModal();
        } else {
          safeSetItem(AUTH_USER, JSON.stringify(user));
          safeSetItem(AUTH_TOKEN, token);
          window.location.href = paths.home();
        }
      } else {
        setError(message);
      }
    } catch (err) {
      logger.error(err);
      setError(err?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadComplete = () => setDownloadComplete(true);
  const handleResetPassword = () => setShowRecoveryForm(true);
  const handleRecoverySubmit = async (username, recoveryCodes) => {
    try {
      const { success, resetToken, error } = await System.recoverAccount(
        username,
        recoveryCodes,
      );

      if (success && resetToken) {
        safeSetItem(RESET_TOKEN, resetToken);
        setShowRecoveryForm(false);
        setShowResetPasswordForm(true);
      } else {
        showToast(error, "error", { clear: true });
      }
    } catch (err) {
      logger.error(err);
    }
  };

  const handleResetSubmit = async (newPassword, confirmPassword) => {
    try {
      const resetToken = safeGetItem(RESET_TOKEN);

      if (resetToken) {
        const { success, error } = await System.resetPassword(
          resetToken,
          newPassword,
          confirmPassword,
        );

        if (success) {
          safeRemoveItem(RESET_TOKEN);
          setShowResetPasswordForm(false);
          showToast(t("multiUserAuth.resetPassword.success"), "success", {
            clear: true,
          });
        } else {
          showToast(error, "error", { clear: true });
        }
      } else {
        showToast(t("multiUserAuth.resetPassword.invalidToken"), "error", {
          clear: true,
        });
      }
    } catch (err) {
      logger.error(err);
    }
  };

  useEffect(() => {
    if (downloadComplete && user && token) {
      safeSetItem(AUTH_USER, JSON.stringify(user));
      safeSetItem(AUTH_TOKEN, token);
      window.location.href = paths.home();
    }
  }, [downloadComplete, user, token]);

  if (showRecoveryForm) {
    return (
      <RecoveryForm
        onSubmit={handleRecoverySubmit}
        setShowRecoveryForm={setShowRecoveryForm}
      />
    );
  }

  if (showResetPasswordForm)
    return <ResetPasswordForm onSubmit={handleResetSubmit} />;

  return (
    <>
      <form onSubmit={handleLogin} className="flex flex-col w-full">
        <div className="flex flex-col gap-y-2 mb-8">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-50 light:text-slate-900">
            {t("login.multi-user.welcome")}
          </h2>
          <p className="text-sm text-zinc-400 light:text-slate-500 leading-relaxed">
            {t("login.sign-in", { appName: appName || "OpenSIN Chat" })}
          </p>
        </div>

        <div className="flex flex-col gap-y-4">
          <div className="flex flex-col gap-y-2">
            <label htmlFor="login-username" className={LABEL_CLASS}>
              {t("login.multi-user.placeholder-username")}
            </label>
            <div className="relative">
              <User
                size={18}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
              />
              <input
                id="login-username"
                name="username"
                type="text"
                aria-label={t("auth.username")}
                className={FIELD_CLASS}
                required={true}
                autoComplete="username"
              />
            </div>
          </div>

          <div className="flex flex-col gap-y-2">
            <label htmlFor="login-password" className={LABEL_CLASS}>
              {t("login.multi-user.placeholder-password")}
            </label>
            <div className="relative">
              <Lock
                size={18}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
              />
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                aria-label={t("auth.password")}
                className={`${FIELD_CLASS} pr-11`}
                required={true}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition"
              >
                {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400"
            >
              {t("login.multi-user.errorPrefix", { error })}
            </p>
          )}
        </div>

        <div className="mt-8 flex flex-col gap-y-4">
          <button
            disabled={loading || appNameLoading}
            aria-busy={loading || appNameLoading}
            aria-label={t("common.save", "Save")}
            type="submit"
            className={PRIMARY_BTN_CLASS}
          >
            {loading ? (
              <>
                <CircleNotch size={18} className="animate-spin" />
                {t("login.multi-user.validating")}
              </>
            ) : (
              t("login.multi-user.login")
            )}
          </button>
          <button
            type="button"
            className={LINK_BTN_CLASS}
            onClick={handleResetPassword}
          >
            {/* eslint-disable-next-line i18next/no-literal-string */}
            {t("login.multi-user.forgot-pass")}?
            <b className="font-semibold text-[#009ee0]">
              {t("login.multi-user.reset")}
            </b>
          </button>
        </div>
      </form>

      <ModalWrapper isOpen={isRecoveryCodeModalOpen} noPortal={true}>
        <RecoveryCodeModal
          recoveryCodes={recoveryCodes}
          onDownloadComplete={handleDownloadComplete}
          onClose={closeRecoveryCodeModal}
        />
      </ModalWrapper>
    </>
  );
}
