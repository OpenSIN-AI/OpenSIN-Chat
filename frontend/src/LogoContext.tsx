// SPDX-License-Identifier: MIT
import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import useSWR from "swr";
import OpenSINLogo from "./media/logo/opensin-logo.png";
import OpenSINLogoDark from "./media/logo/opensin-logo-dark.png";
import DefaultLoginLogo from "./media/logo/opensin-logo.png";
import System from "./models/system";
import { resolveDarkMode } from "./hooks/useTheme";

export const REFETCH_LOGO_EVENT = "refetch-logo";
export const LOGO_CACHE_KEY = "system/logo";

export interface LogoContextValue {
  logo: string;
  setLogo: (logo: string) => void;
  loginLogo: string;
  isCustomLogo: boolean;
}

export const LogoContext = createContext<LogoContextValue | undefined>(undefined);

type LogoData = {
  logo: string;
  loginLogo: string;
  isCustomLogo: boolean;
};

export function LogoProvider({ children }: { children: React.ReactNode }) {
  // Tracks the currently rendered blob: object URL so it can be revoked
  // *after* the new logo has been rendered, preventing a broken-image flash
  // or permanent disappearance when the theme changes.
  const currentLogoRef = useRef<string | null>(null);

  async function fetchLogoData(): Promise<LogoData> {
    const isDarkMode = resolveDarkMode();
    const fallbackLogo = isDarkMode ? OpenSINLogoDark : OpenSINLogo;
    const defaultLoginLogo = isDarkMode ? OpenSINLogoDark : DefaultLoginLogo;

    try {
      const { isCustomLogo, logoURL } = await System.fetchLogo();
      if (logoURL) {
        return {
          logo: logoURL,
          loginLogo: isCustomLogo ? logoURL : defaultLoginLogo,
          isCustomLogo,
        };
      }
      return {
        logo: fallbackLogo,
        loginLogo: defaultLoginLogo,
        isCustomLogo: false,
      };
    } catch {
      return {
        logo: fallbackLogo,
        loginLogo: defaultLoginLogo,
        isCustomLogo: false,
      };
    }
  }

  const { data, mutate } = useSWR<LogoData>(LOGO_CACHE_KEY, fetchLogoData, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    // Provide immediate fallback values so consumers never receive undefined.
    fallbackData: {
      logo: OpenSINLogo,
      loginLogo: DefaultLoginLogo,
      isCustomLogo: false,
    },
  });

  // Revoke the previous blob: object URL after the new logo has been rendered.
  useEffect(() => {
    const nextLogo = data?.logo;
    if (nextLogo === currentLogoRef.current) return;
    const prevLogo = currentLogoRef.current;
    currentLogoRef.current = nextLogo?.startsWith("blob:") ? nextLogo : null;
    if (prevLogo && prevLogo !== nextLogo && prevLogo.startsWith("blob:")) {
      URL.revokeObjectURL(prevLogo);
    }
  }, [data?.logo]);

  // When a REFETCH_LOGO_EVENT fires (e.g. after theme change or custom logo upload),
  // tell SWR to re-run the fetcher and broadcast the new value to all consumers.
  useEffect(() => {
    const handleRefetch = () => mutate();
    window.addEventListener(REFETCH_LOGO_EVENT, handleRefetch);
    return () => {
      window.removeEventListener(REFETCH_LOGO_EVENT, handleRefetch);
      if (
        currentLogoRef.current &&
        currentLogoRef.current.startsWith("blob:")
      ) {
        URL.revokeObjectURL(currentLogoRef.current);
        currentLogoRef.current = null;
      }
    };
  }, [mutate]);

  const setLogo = useCallback(
    (logo: string) => mutate((prev) => ({ ...prev!, logo }), false),
    [mutate],
  );

  const value = useMemo<LogoContextValue>(
    () => ({
      logo: data!.logo,
      setLogo,
      loginLogo: data!.loginLogo,
      isCustomLogo: data!.isCustomLogo,
    }),
    [data?.logo, data?.loginLogo, data?.isCustomLogo, setLogo],
  );

  return <LogoContext.Provider value={value}>{children}</LogoContext.Provider>;
}
