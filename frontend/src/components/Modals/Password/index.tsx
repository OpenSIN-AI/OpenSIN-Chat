// SPDX-License-Identifier: MIT
import React from "react";
import { useTranslation } from "react-i18next";
import { ShieldCheck, EyeSlash, Cpu } from "@phosphor-icons/react";
import SingleUserAuth from "./SingleUserAuth";
import MultiUserAuth from "./MultiUserAuth";
import useLogo from "../../../hooks/useLogo";
import System from "../../../models/system";
import {
  AUTH_TOKEN,
  AUTH_USER,
  AUTH_TIMESTAMP,
} from "../../../utils/constants";
import useSystemSettings from "../../../hooks/useSystemSettings";
import { safeGetItem, safeRemoveItem } from "@/utils/safeStorage";
import useSWR from "swr";

const AUTH_CHECK_KEY = "system/auth-check";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Souverän & selbst gehostet",
    desc: "Deine Daten bleiben auf deiner eigenen Infrastruktur.",
  },
  {
    icon: EyeSlash,
    title: "Keine Telemetrie",
    desc: "Null Outbound-Tracking. DSGVO-konforme Defaults.",
  },
  {
    icon: Cpu,
    title: "Deine Modelle, deine Regeln",
    desc: "Von OpenAI bis Ollama — lokal oder in der Cloud.",
  },
];

export default function PasswordModal({ mode = "single" }: any) {
  const { t } = useTranslation();
  const { loginLogo, isCustomLogo } = useLogo();

  return (
    <div className="fixed inset-0 flex bg-[#0a0a0a] light:bg-[#fafafa] overflow-hidden">
      {/* Left brand panel */}
      <div className="relative hidden lg:flex lg:w-[44%] flex-col justify-center gap-y-12 p-14 xl:p-16 border-r border-white/[0.06] light:border-zinc-200">
        <div className="flex items-center gap-x-2.5">
          <img
            src={loginLogo}
            alt={t("common.logo")}
            className={`max-h-8 w-auto object-contain ${
              isCustomLogo ? "rounded-md" : ""
            }`}
          />
          <span className="text-[#fafafa] light:text-zinc-900 text-sm font-semibold tracking-tight">
            OpenSIN Chat
          </span>
        </div>

        <div className="max-w-sm">
          <h1 className="text-3xl xl:text-[2.5rem] font-semibold text-[#fafafa] light:text-zinc-900 leading-[1.15] text-balance tracking-tight">
            Dein souveräner KI-Arbeitsraum.
          </h1>
          <p className="mt-4 text-[#71717a] light:text-zinc-500 text-sm leading-relaxed text-pretty">
            Chatte mit deinen Dokumenten, automatisiere Recherche und behalte
            die volle Kontrolle über deine Daten.
          </p>

          <ul className="mt-10 flex flex-col gap-y-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex items-start gap-x-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] light:border-zinc-200 bg-white/[0.04] light:bg-zinc-50">
                  <Icon size={15} weight="bold" className="text-[#a1a1aa] light:text-zinc-500" />
                </span>
                <div>
                  <p className="text-sm font-medium text-[#e4e4e7] light:text-zinc-800">{title}</p>
                  <p className="text-xs text-[#52525b] light:text-zinc-400 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[11px] text-[#3f3f46] light:text-zinc-400 tracking-wide mt-4">
          © {new Date().getFullYear()} OpenSIN Chat · Selbst gehostet · Keine Telemetrie
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex w-full lg:w-[56%] items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[360px]">
          {/* Logo for mobile */}
          <div className="mb-8 flex flex-col items-center gap-y-3 lg:hidden">
            <img
              src={loginLogo}
              alt={t("common.logo")}
              className={`max-h-10 object-contain ${
                isCustomLogo ? "rounded-lg" : ""
              }`}
            />
          </div>

          <div className="rounded-xl border border-white/[0.08] light:border-zinc-200 bg-[#111111] light:bg-white p-7 shadow-2xl shadow-black/40">
            {mode === "single" ? (
              <SingleUserAuth />
            ) : mode === "single-auto" ? (
              <SingleUserAuth autoLogin={true} />
            ) : (
              <MultiUserAuth />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function usePasswordModal(notry: any = false) {
  const {
    settings,
    loading: settingsLoading,
    error: settingsError,
  } = useSystemSettings();
  const { MultiUserMode, RequiresAuth } = settings || {};

  const currentToken = safeGetItem(AUTH_TOKEN);

  const skipCheck =
    settingsLoading ||
    (!System.needsAuthCheck() && notry === false) ||
    (!MultiUserMode && !RequiresAuth);

  const needsTokenCheck = !skipCheck && !!currentToken;

  const { data: tokenValid, isLoading: tokenLoading } = useSWR(
    needsTokenCheck ? [AUTH_CHECK_KEY, currentToken] : null,
    () => System.checkAuth(currentToken),
    { revalidateOnFocus: false, dedupingInterval: 5000 },
  );

  if (settingsLoading || (needsTokenCheck && tokenLoading)) {
    return { loading: true, requiresAuth: false, mode: "single" };
  }

  if (settingsError && !settingsLoading) {
    return {
      loading: false,
      requiresAuth: false,
      mode: "single",
      apiError: true,
    };
  }

  if (!MultiUserMode && !RequiresAuth) {
    if (currentToken) {
      return { loading: false, requiresAuth: false, mode: "single" };
    }
    return { loading: false, requiresAuth: true, mode: "single-auto" };
  }

  if (!System.needsAuthCheck() && notry === false) {
    return {
      loading: false,
      requiresAuth: false,
      mode: MultiUserMode ? "multi" : "single",
    };
  }

  const mode = MultiUserMode ? "multi" : "single";

  if (!currentToken) {
    return { loading: false, requiresAuth: true, mode };
  }

  if (tokenValid === false) {
    safeRemoveItem(AUTH_USER);
    safeRemoveItem(AUTH_TOKEN);
    safeRemoveItem(AUTH_TIMESTAMP);
    return { loading: false, requiresAuth: true, mode };
  }

  return { loading: false, requiresAuth: false, mode };
}
