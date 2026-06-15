// SPDX-License-Identifier: MIT
import React from "react";
import { useTranslation } from "react-i18next";
import System from "../../../models/system";
import SingleUserAuth from "./SingleUserAuth";
import MultiUserAuth from "./MultiUserAuth";
import {
  AUTH_TOKEN,
  AUTH_USER,
  AUTH_TIMESTAMP,
} from "../../../utils/constants";
import useLogo from "../../../hooks/useLogo";
import useSystemSettings from "../../../hooks/useSystemSettings";
import useSWR from "swr";

const AUTH_CHECK_KEY = "system/auth-check";

export default function PasswordModal({ mode = "single" }: any) {
  const { t } = useTranslation();
  const { loginLogo, isCustomLogo } = useLogo();
  return (
    <div className="fixed inset-0 bg-zinc-950 light:bg-slate-50 flex flex-col items-center justify-center overflow-hidden">
      <img
        src={loginLogo}
        alt={t("common.logo")}
        className={`max-h-[80px] object-contain ${isCustomLogo ? "rounded-lg" : ""}`}
      />
      {mode === "single" ? <SingleUserAuth /> : <MultiUserAuth />}
    </div>
  );
}

export function usePasswordModal(notry: any = false) {
  const { settings, loading: settingsLoading } = useSystemSettings();
  const { MultiUserMode, RequiresAuth } = settings || {};

  const currentToken = window.localStorage.getItem(AUTH_TOKEN);

  // Determine if we actually need a token validity check.
  // Skip when: settings are still loading, notry guard allows skip, or no token exists.
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

  // While settings or token check are in-flight, stay in the loading state.
  if (settingsLoading || (needsTokenCheck && tokenLoading)) {
    return { loading: true, requiresAuth: false, mode: "single" };
  }

  // Auth is not required in this environment
  if (!MultiUserMode && !RequiresAuth) {
    return { loading: false, requiresAuth: false, mode: "single" };
  }

  // Skip the check (valid cached timestamp / notry guard)
  if (!System.needsAuthCheck() && notry === false) {
    return {
      loading: false,
      requiresAuth: false,
      mode: MultiUserMode ? "multi" : "single",
    };
  }

  const mode = MultiUserMode ? "multi" : "single";

  // No token present at all — require login
  if (!currentToken) {
    return { loading: false, requiresAuth: true, mode };
  }

  // Token check returned invalid — clean up storage
  if (tokenValid === false) {
    window.localStorage.removeItem(AUTH_USER);
    window.localStorage.removeItem(AUTH_TOKEN);
    window.localStorage.removeItem(AUTH_TIMESTAMP);
    return { loading: false, requiresAuth: true, mode };
  }

  return { loading: false, requiresAuth: false, mode };
}
