// SPDX-License-Identifier: MIT
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FullScreenLoader } from "@/components/Preloader";
import paths from "@/utils/paths";
import useQuery from "@/hooks/useQuery";
import System from "@/models/system";
import { AUTH_TIMESTAMP, AUTH_TOKEN, AUTH_USER } from "@/utils/constants";
import { safeSetItem, safeRemoveItem } from "@/utils/safeStorage";

export default function SimpleSSOPassthrough() {
  const { t } = useTranslation();
  const query = useQuery();
  const redirectPath = query.get("redirectTo") || paths.home();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = query.get("token");
    try {
      if (!token) throw new Error("No token provided.");

      // Clear any existing auth data
      safeRemoveItem(AUTH_USER);
      safeRemoveItem(AUTH_TOKEN);
      safeRemoveItem(AUTH_TIMESTAMP);

      System.simpleSSOLogin(token!)
        .then((res: any) => {
          if (!res.valid) throw new Error(res.message);

          safeSetItem(AUTH_USER, JSON.stringify(res.user));
          safeSetItem(AUTH_TOKEN, res.token);
          safeSetItem(AUTH_TIMESTAMP, String(Number(new Date())));
          setReady(res.valid);
        })
        .catch((e) => {
          setError(e.message);
        });
    } catch (e: any) {
      setError(e.message);
    }
  }, [query]);

  if (error)
    return (
      <div className="w-screen h-screen overflow-hidden bg-theme-bg-primary flex items-center justify-center flex-col gap-4">
        <p className="text-theme-text-primary font-mono text-lg">{error}</p>
        <p className="text-theme-text-secondary font-mono text-sm">
          {t("common.contactAdministrator")}
        </p>
      </div>
    );
  if (ready) {
    window.location.replace(redirectPath);
    return null;
  }

  // Loading state by default
  return <FullScreenLoader />;
}
