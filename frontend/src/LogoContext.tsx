// SPDX-License-Identifier: MIT
import React, { createContext, useEffect, useRef } from "react";
import useSWR from "swr";
import OpenSINLogo from "./media/logo/opensin-logo.png";
import OpenSINLogoDark from "./media/logo/opensin-logo-dark.png";
import DefaultLoginLogo from "./media/logo/opensin-logo.png";
import System from "./models/system";

export const REFETCH_LOGO_EVENT = "refetch-logo";
export const LOGO_CACHE_KEY = "system/logo";

export const LogoContext = createContext<any>(undefined);

type LogoData = {
  logo: string;
  loginLogo: string;
  isCustomLogo: boolean;
};

export function LogoProvider({ children }) {
  // Tracks the most recently created blob: object URL so it can be revoked
  // before being replaced and on unmount, preventing object-URL memory leaks.
  const objectURLRef = useRef<string | null>(null);

  async function fetchLogoData(): Promise<LogoData> {
    const isDarkMode =
      (localStorage.getItem("theme") || "default") === "default";
    const fallbackLogo = isDarkMode ? OpenSINLogoDark : OpenSINLogo;
    const defaultLoginLogo = isDarkMode ? OpenSINLogoDark : DefaultLoginLogo;

    try {
      const { isCustomLogo, logoURL } = await System.fetchLogo();
      if (objectURLRef.current && objectURLRef.current !== logoURL) {
        URL.revokeObjectURL(objectURLRef.current);
        objectURLRef.current = null;
      }
      if (logoURL) {
        objectURLRef.current = logoURL;
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

  // When a REFETCH_LOGO_EVENT fires (e.g. after a custom logo upload),
  // tell SWR to re-run the fetcher and broadcast the new value to all
  // consumers — replaces the direct fetchInstanceLogo() call.
  useEffect(() => {
    const handleRefetch = () => mutate();
    window.addEventListener(REFETCH_LOGO_EVENT, handleRefetch);
    return () => {
      window.removeEventListener(REFETCH_LOGO_EVENT, handleRefetch);
      if (objectURLRef.current) {
        URL.revokeObjectURL(objectURLRef.current);
        objectURLRef.current = null;
      }
    };
  }, [mutate]);

  return (
    <LogoContext.Provider
      value={{
        logo: data!.logo,
        setLogo: (logo: string) =>
          mutate((prev) => ({ ...prev!, logo }), false),
        loginLogo: data!.loginLogo,
        isCustomLogo: data!.isCustomLogo,
      }}
    >
      {children}
    </LogoContext.Provider>
  );
}
