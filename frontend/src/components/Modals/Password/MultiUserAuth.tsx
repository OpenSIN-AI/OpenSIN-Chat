// SPDX-License-Identifier: MIT
import React, { useState, useEffect } from "react";
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
    <form
      onSubmit={handleSubmit}
      className="flex flex-col justify-center items-center w-full max-w-sm px-4"
    >
      <div className="flex items-start justify-between pt-7 pb-9">
        <div className="flex items-center flex-col gap-y-[18px] max-w-[300px]">
          <div className="flex gap-x-1">
            <h3 className="text-white light:text-slate-950 text-3xl leading-[28px] font-medium text-center white-space-nowrap block">
              {t("login.password-reset.title")}
            </h3>
          </div>
          <p className="text-zinc-400 light:text-zinc-600 text-sm text-center">
            {t("login.password-reset.description")}
          </p>
        </div>
      </div>
      <div className="w-full">
        <div className="w-full flex flex-col gap-y-3">
          <div className="w-full flex flex-col gap-y-2">
            <label
              htmlFor="recovery-username"
              className="text-zinc-300 light:text-slate-800 text-sm"
            >
              {t("login.multi-user.placeholder-username")}
            </label>
            <input
              id="recovery-username"
              name="username"
              type="text"
              aria-label={t("auth.username")}
              className="border-none bg-zinc-800 light:bg-slate-200 text-zinc-200 light:text-zinc-600 text-sm rounded-lg p-2.5 w-full max-w-[300px] h-[34px] focus:outline-none focus:ring-1 focus:ring-sky-300"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div className="w-full flex flex-col gap-y-2">
            <label className="text-zinc-300 light:text-slate-800 text-sm">
              {t("login.password-reset.recovery-codes")}
            </label>
            {recoveryCodeInputs.map((code, index) => (
              <input
                key={index}
                type="text"
                name={`recoveryCode${index + 1}`}
                aria-label={`${t("login.password-reset.recovery-codes")} ${
                  index + 1
                }`}
                className="border-none bg-zinc-800 light:bg-slate-200 text-zinc-200 light:text-zinc-600 text-sm rounded-lg p-2.5 w-full max-w-[300px] h-[34px] focus:outline-none focus:ring-1 focus:ring-sky-300"
                value={code}
                onChange={(e) =>
                  handleRecoveryCodeChange(index, e.target.value)
                }
                required
                autoComplete="one-time-code"
              />
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center mt-9 space-x-2 w-full flex-col gap-y-6">
        <button
          type="submit"
          disabled={loading}
          className="text-zinc-950 bg-white hover:bg-zinc-300 light:bg-sky-200 light:text-slate-950 light:hover:bg-sky-300 text-sm font-semibold rounded-lg border-primary-button h-[34px] w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? t("login.multi-user.validating")
            : t("login.password-reset.title")}
        </button>
        <button
          type="button"
          className="text-zinc-200 light:text-zinc-600 hover:text-sky-300 light:hover:text-sky-600 hover:underline text-sm flex gap-x-1"
          onClick={() => setShowRecoveryForm(false)}
        >
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
    <form
      onSubmit={handleSubmit}
      className="flex flex-col justify-center items-center w-full max-w-sm px-4"
    >
      <div className="flex items-start justify-between pt-7 pb-9">
        <div className="flex items-center flex-col gap-y-[18px] max-w-[300px]">
          <div className="flex gap-x-1">
            <h3 className="text-white light:text-slate-950 text-[38px] leading-[28px] font-medium text-center white-space-nowrap block">
              {t("multiUserAuth.resetPassword.title")}
            </h3>
          </div>
          <p className="text-zinc-400 light:text-zinc-600 text-sm text-center">
            {t("multiUserAuth.resetPassword.description")}
          </p>
        </div>
      </div>
      <div className="w-full">
        <div className="w-full flex flex-col gap-y-3">
          <div className="w-full flex flex-col gap-y-2">
            <label
              htmlFor="reset-newPassword"
              className="text-zinc-300 light:text-slate-800 text-sm"
            >
              {t("multiUserAuth.resetPassword.newPassword")}
            </label>
            <input
              id="reset-newPassword"
              type="password"
              name="newPassword"
              aria-label={t("auth.newPassword")}
              className="border-none bg-zinc-800 light:bg-slate-200 text-zinc-200 light:text-zinc-600 text-sm rounded-lg p-2.5 w-full max-w-[300px] h-[34px] focus:outline-none focus:ring-1 focus:ring-sky-300"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <div className="w-full flex flex-col gap-y-2">
            <label
              htmlFor="reset-confirmPassword"
              className="text-zinc-300 light:text-slate-800 text-sm"
            >
              {t("multiUserAuth.resetPassword.confirmPassword")}
            </label>
            <input
              id="reset-confirmPassword"
              type="password"
              name="confirmPassword"
              aria-label={t("auth.newPassword")}
              className="border-none bg-zinc-800 light:bg-slate-200 text-zinc-200 light:text-zinc-600 text-sm rounded-lg p-2.5 w-full max-w-[300px] h-[34px] focus:outline-none focus:ring-1 focus:ring-sky-300"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
        </div>
      </div>
      <div className="flex items-center mt-9 space-x-2 w-full flex-col gap-y-6">
        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="text-zinc-950 bg-white hover:bg-zinc-300 light:bg-sky-200 light:text-slate-950 light:hover:bg-sky-300 text-sm font-semibold rounded-lg border-primary-button h-[34px] w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? t("login.multi-user.validating")
            : t("multiUserAuth.resetPassword.title")}
        </button>
      </div>
    </form>
  );
};

export default function MultiUserAuth() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
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
      console.error(err);
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
      console.error(err);
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
      console.error(err);
    } finally {
      setLoading(false);
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
      <form
        onSubmit={handleLogin}
        className="flex flex-col justify-center items-center w-full max-w-sm px-4"
      >
        <div className="flex items-start justify-between pt-7 pb-9">
          <div className="flex items-center flex-col gap-y-[18px] max-w-[300px]">
            <div className="flex gap-x-1">
              <h3 className="text-white light:text-slate-950 text-[38px] leading-[28px] font-medium text-center white-space-nowrap block">
                {t("login.multi-user.welcome")}
              </h3>
            </div>
            <p className="text-zinc-400 light:text-zinc-600 text-sm text-center">
              {t("login.sign-in", { appName: appName || "OpenSIN Chat" })}
            </p>
          </div>
        </div>
        <div className="w-full">
          <div className="w-full flex flex-col gap-y-3">
            <div className="w-full flex flex-col gap-y-2">
              <label
                htmlFor="login-username"
                className="text-zinc-300 light:text-slate-800 text-sm"
              >
                {t("login.multi-user.placeholder-username")}
              </label>
              <input
                id="login-username"
                name="username"
                type="text"
                aria-label={t("auth.username")}
                className="border-none bg-zinc-800 light:bg-slate-200 text-zinc-200 light:text-zinc-600 text-sm rounded-lg p-2.5 w-full max-w-[300px] h-[34px] focus:outline-none focus:ring-1 focus:ring-sky-300"
                required={true}
                autoComplete="username"
              />
            </div>
            <div className="w-full px-0 flex flex-col gap-y-2">
              <label
                htmlFor="login-password"
                className="text-zinc-300 light:text-slate-800 text-sm"
              >
                {t("login.multi-user.placeholder-password")}
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                aria-label={t("auth.password")}
                className="border-none bg-zinc-800 light:bg-slate-200 text-zinc-200 light:text-zinc-600 text-sm rounded-lg p-2.5 w-full max-w-[300px] h-[34px] focus:outline-none focus:ring-1 focus:ring-sky-300"
                required={true}
                autoComplete="current-password"
              />
            </div>
            {error && (
              <p role="alert" className="text-red-400 text-sm">
                {t("login.multi-user.errorPrefix", { error })}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center mt-9 space-x-2 w-full flex-col gap-y-6">
          <button
            disabled={loading || appNameLoading}
            aria-busy={loading || appNameLoading}
            type="submit"
            className="text-zinc-950 bg-white hover:bg-zinc-300 light:bg-sky-200 light:text-slate-950 light:hover:bg-sky-300 text-sm font-semibold rounded-lg border-primary-button h-[34px] w-full"
          >
            {loading
              ? t("login.multi-user.validating")
              : t("login.multi-user.login")}
          </button>
          <button
            type="button"
            className="text-zinc-200 light:text-zinc-600 hover:text-sky-300 light:hover:text-sky-600 hover:underline text-sm flex gap-x-1"
            onClick={handleResetPassword}
          >
            {/* eslint-disable-next-line i18next/no-literal-string */}
            {t("login.multi-user.forgot-pass")}?
            <b className="font-semibold text-sky-300 light:text-sky-600">
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
