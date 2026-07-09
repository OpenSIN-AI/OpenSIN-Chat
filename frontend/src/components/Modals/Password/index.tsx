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
    <div className="fixed inset-0 flex bg-zinc-950 light:bg-slate-50 overflow-hidden">
      {/* Left brand panel */}
      <div className="relative hidden lg:flex lg:w-[45%] flex-col justify-between p-12 xl:p-16 border-r border-white/5">
        {/* subtle accent glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(120% 100% at 15% 0%, rgba(0,158,224,0.14) 0%, rgba(0,158,224,0) 55%)",
          }}
        />

        <div className="flex items-center gap-x-3">
          <img
            src={loginLogo}
            alt={t("common.logo")}
            className={`max-h-9 w-auto object-contain ${
              isCustomLogo ? "rounded-md" : ""
            }`}
          />
          <span className="text-zinc-100 text-lg font-semibold tracking-tight">
            OpenSIN Chat
          </span>
        </div>

        <div className="max-w-md">
          <h1 className="text-4xl xl:text-5xl font-semibold text-zinc-50 leading-tight text-balance">
            Dein souveräner KI-Arbeitsraum.
          </h1>
          <p className="mt-4 text-zinc-400 text-base leading-relaxed text-pretty">
            Chatte mit deinen Dokumenten, automatisiere Recherche und behalte
            die volle Kontrolle über deine Daten.
          </p>

          <ul className="mt-10 flex flex-col gap-y-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex items-start gap-x-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#009ee0]/10 ring-1 ring-[#009ee0]/25">
                  <Icon size={18} weight="bold" className="text-[#009ee0]" />
                </span>
                <div>
                  <p className="text-sm font-medium text-zinc-100">{title}</p>
                  <p className="text-sm text-zinc-500">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-zinc-600">
          © {new Date().getFullYear()} OpenSIN Chat · Selbst gehostet · Keine
          Telemetrie
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex w-full lg:w-[55%] items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          {/* Logo shown on top for mobile / when left panel is hidden */}
          <div className="mb-8 flex flex-col items-center gap-y-3 lg:hidden">
            <img
              src={loginLogo}
              alt={t("common.logo")}
              className={`max-h-14 object-contain ${
                isCustomLogo ? "rounded-lg" : ""
              }`}
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 light:bg-white light:border-slate-200 p-8 shadow-2xl shadow-black/30 backdrop-blur-sm">
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
