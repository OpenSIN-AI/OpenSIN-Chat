// SPDX-License-Identifier: MIT
import React, { useState, useEffect } from "react";
import { Lock, Eye, EyeSlash, CircleNotch } from "@phosphor-icons/react";
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
  const [showPassword, setShowPassword] = useState<boolean>(false);
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
      <form onSubmit={handleLogin} className="flex flex-col w-full">
        <div className="flex flex-col gap-y-2 mb-8">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-50 light:text-slate-900">
            {t("login.multi-user.welcome")}
          </h2>
          <p className="text-sm text-zinc-400 light:text-slate-500 leading-relaxed">
            {t("login.sign-in", { appName: appName || "OpenSIN Chat" })}
          </p>
        </div>

        <div className="flex flex-col gap-y-2">
          <label
            htmlFor="single-user-password"
            className="text-sm font-medium text-zinc-300 light:text-slate-700"
          >
            {t("login.single-user.password")}
          </label>
          <div className="relative">
            <Lock
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
            />
            <input
              aria-label={t("common.password", "Password")}
              id="single-user-password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="w-full h-12 rounded-xl border border-white/10 bg-zinc-800/60 light:bg-slate-100 light:border-slate-200 pl-11 pr-11 text-sm text-zinc-100 light:text-slate-900 placeholder:text-zinc-600 transition focus:outline-none focus:border-[#009ee0] focus:ring-2 focus:ring-[#009ee0]/30"
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

          {error && (
            <p
              role="alert"
              className="mt-1 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400"
            >
              {t("login.multi-user.errorPrefix", { error })}
            </p>
          )}
        </div>

        <button
          disabled={loading || appNameLoading}
          type="submit"
          aria-label={t("common.save", "Save")}
          className="mt-8 flex h-12 w-full items-center justify-center gap-x-2 rounded-xl bg-[#009ee0] text-sm font-semibold text-white transition hover:bg-[#0089c4] focus:outline-none focus:ring-2 focus:ring-[#009ee0]/40 disabled:cursor-not-allowed disabled:opacity-60"
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
