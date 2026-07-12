// SPDX-License-Identifier: MIT
// Purpose: Presents the authentication shell with a restrained, workspace-first visual hierarchy.
// Docs: index.doc.md
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
    <div className="fixed inset-0 flex overflow-hidden bg-theme-bg-primary light:bg-[#fafafa]">
      {/* Workspace context */}
      <aside className="relative hidden min-w-[22rem] max-w-[28rem] flex-1 flex-col justify-between border-r border-white/[0.08] bg-theme-bg-sidebar p-10 light:border-zinc-200 light:bg-zinc-50 lg:flex xl:p-12">
        <div className="flex items-center gap-x-2.5">
          <img
            src={loginLogo}
            alt={t("common.logo")}
            className={`max-h-8 w-auto object-contain ${
              isCustomLogo ? "rounded-md" : ""
            }`}
          />
          <span className="text-sm font-semibold tracking-tight text-[#fafafa] light:text-zinc-900">
            OpenSIN Chat
          </span>
        </div>

        <div className="max-w-xs">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.16em] text-[#71717a] light:text-zinc-500">
            Souveräner Arbeitsbereich
          </p>
          <h1 className="text-3xl font-semibold leading-[1.12] tracking-tight text-[#fafafa] text-balance light:text-zinc-900 xl:text-[2.25rem]">
            Dein souveräner KI-Arbeitsraum.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-[#a1a1aa] text-pretty light:text-zinc-500">
            Chatte mit deinen Dokumenten, automatisiere Recherche und behalte
            die volle Kontrolle über deine Daten.
          </p>

          <ul className="mt-9 flex flex-col gap-y-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex items-start gap-x-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.04] light:border-zinc-200 light:bg-white">
                  <Icon
                    size={15}
                    weight="bold"
                    className="text-[#a1a1aa] light:text-zinc-500"
                  />
                </span>
                <div>
                  <p className="text-sm font-medium text-[#e4e4e7] light:text-zinc-800">
                    {title}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-[#71717a] light:text-zinc-500">
                    {desc}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[11px] tracking-wide text-[#52525b] light:text-zinc-400">
          © {new Date().getFullYear()} OpenSIN Chat · Selbst gehostet · Keine
          Telemetrie
        </p>
      </aside>

      {/* Right form panel */}
      <main className="flex w-full items-center justify-center bg-theme-bg-primary p-6 light:bg-white sm:p-10">
        <div className="w-full max-w-[380px]">
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

          <div className="rounded-xl border border-white/[0.1] bg-theme-bg-secondary p-7 shadow-[0_24px_80px_rgba(0,0,0,0.28)] light:border-zinc-200 light:bg-white sm:p-8">
            {mode === "single" ? (
              <SingleUserAuth />
            ) : mode === "single-auto" ? (
              <SingleUserAuth autoLogin={true} />
            ) : (
              <MultiUserAuth />
            )}
          </div>
        </div>
      </main>
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

  if ((tokenValid as any) === false) {
    safeRemoveItem(AUTH_USER);
    safeRemoveItem(AUTH_TOKEN);
    safeRemoveItem(AUTH_TIMESTAMP);
    return { loading: false, requiresAuth: true, mode };
  }

  return { loading: false, requiresAuth: false, mode };
}
