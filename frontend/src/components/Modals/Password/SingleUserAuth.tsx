// SPDX-License-Identifier: MIT
import React, { useState, useEffect } from "react";
import System from "../../../models/system";
import { AUTH_TOKEN } from "../../../utils/constants";
import paths from "../../../utils/paths";
import { safeSetItem } from "@/utils/safeStorage";
import ModalWrapper from "@/components/ModalWrapper";
import { useModal } from "@/hooks/useModal";
import RecoveryCodeModal from "@/components/Modals/DisplayRecoveryCodeModal";
import { useTranslation } from "react-i18next";
import useCustomAppName from "@/hooks/useCustomAppName";
import useSystemSettings from "@/hooks/useSystemSettings";
import logger from "@/utils/logger";

export default function SingleUserAuth({
  autoLogin = false,
}: {
  autoLogin?: boolean;
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [downloadComplete, setDownloadComplete] = useState<boolean>(false);
  const [token, setToken] = useState(null);

  const { appName, isLoading: appNameLoading } = useCustomAppName();
  const { settings } = useSystemSettings();
  const requiresAuth = settings?.RequiresAuth ?? true;

  const {
    isOpen: isRecoveryCodeModalOpen,
    openModal: openRecoveryCodeModal,
    closeModal: closeRecoveryCodeModal,
  } = useModal();

  // Auto-login for single-user no-password mode: the server auto-grants a
  // session token when AUTH_TOKEN is not set, so we request it immediately and
  // store it so subsequent authenticated calls (e.g. API key management) work.
  useEffect(() => {
    if (!autoLogin || requiresAuth) return;
    let cancelled = false;
    setLoading(true);
    System.requestToken({})
      .then(({ valid, token, message }) => {
        if (cancelled) return;
        if (valid && token) {
          safeSetItem(AUTH_TOKEN, token);
          window.location.href = paths.home();
        } else {
          setError(message || "Auto-login failed.");
          setLoading(false);
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.message || "Auto-login failed.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [autoLogin, requiresAuth]);

  const handleLogin = async (e) => {
    setError(null);
    e.preventDefault();
    setLoading(true);
    const data = {};
    const form = new FormData(e.target);
    for (const [key, value] of form.entries()) data[key] = value;
    try {
      const { valid, token, message, recoveryCodes } =
        await System.requestToken(data);
      if (valid && !!token) {
        setToken(token);
        if (recoveryCodes) {
          setRecoveryCodes(recoveryCodes);
          openRecoveryCodeModal();
        } else {
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

  const handleDownloadComplete = () => {
    setDownloadComplete(true);
  };

  useEffect(() => {
    if (downloadComplete && token) {
      safeSetItem(AUTH_TOKEN, token);
      window.location.href = paths.home();
    }
  }, [downloadComplete, token]);

  return (
    <>
      <form
        onSubmit={handleLogin}
        className="flex flex-col justify-center items-center w-full max-w-sm px-4"
      >
        <div className="flex items-start justify-between pt-7 pb-9 w-full">
          <div className="flex items-center flex-col gap-y-[18px] max-w-[300px]">
            <div className="flex gap-x-1">
              <h3 className="text-theme-text-primary light:text-theme-text-primary text-3xl leading-[28px] font-medium text-center white-space-nowrap block">
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
                htmlFor="single-user-password"
                className="text-zinc-300 light:text-slate-800 text-sm"
              >
                {t("login.single-user.password")}
              </label>
              <input aria-label={t("common.password", "Password")}
                id="single-user-password"
                name="password"
                type="password"
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
            type="submit"
            aria-label={t("common.save", "Save")}
            className="text-zinc-950 bg-white hover:bg-zinc-300 light:bg-sky-200 light:text-slate-950 light:hover:bg-sky-300 text-sm font-semibold rounded-lg border-primary-button h-[34px] w-full"
          >
            {loading
              ? t("login.multi-user.validating")
              : t("login.multi-user.login")}
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
