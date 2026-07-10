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
  const [error, setError] = useState<any>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [downloadComplete, setDownloadComplete] = useState<boolean>(false);
  const [token, setToken] = useState<any>(null);

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
        <div className="flex flex-col gap-y-1.5 mb-7">
          <h2 className="text-xl font-semibold tracking-tight text-[#fafafa] light:text-zinc-900">
            {t("login.multi-user.welcome")}
          </h2>
          <p className="text-sm text-[#71717a] light:text-zinc-500 leading-relaxed">
            {t("login.sign-in", { appName: appName || "OpenSIN Chat" })}
          </p>
        </div>

        <div className="flex flex-col gap-y-2">
          <label
            htmlFor="single-user-password"
            className="text-xs font-medium text-[#a1a1aa] light:text-zinc-500 uppercase tracking-wider"
          >
            {t("login.single-user.password")}
          </label>
          <div className="relative">
            <Lock
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#52525b]"
            />
            <input
              aria-label={t("common.password", "Password")}
              id="single-user-password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="w-full h-10 rounded-lg border border-white/[0.08] light:border-zinc-200 bg-[#1c1c1c] light:bg-zinc-50 pl-10 pr-10 text-sm text-[#fafafa] light:text-zinc-900 placeholder:text-[#3f3f46] light:placeholder:text-zinc-300 transition focus:outline-none focus:border-white/20 light:focus:border-zinc-400 focus:bg-[#222222] light:focus:bg-white"
              required={true}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-md text-[#52525b] hover:text-[#a1a1aa] hover:bg-white/[0.05] transition"
            >
              {showPassword ? <EyeSlash size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-md border border-red-500/20 bg-red-500/[0.08] px-3 py-2 text-xs text-red-400"
            >
              {t("login.multi-user.errorPrefix", { error })}
            </p>
          )}
        </div>

        <button
          disabled={loading || appNameLoading}
          type="submit"
          aria-label={t("common.save", "Save")}
          className="mt-6 flex h-10 w-full items-center justify-center gap-x-2 rounded-lg bg-[#fafafa] light:bg-zinc-900 text-sm font-semibold text-zinc-900 light:text-white transition hover:bg-[#e4e4e7] light:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? (
            <>
              <CircleNotch size={16} className="animate-spin" />
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
