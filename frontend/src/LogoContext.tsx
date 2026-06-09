// SPDX-License-Identifier: MIT
import { createContext, useEffect, useState } from "react";
import OpenAfDLogo from "./media/logo/openafd-logo.png";
import OpenAfDLogoDark from "./media/logo/openafd-logo-dark.png";
import DefaultLoginLogo from "./media/logo/openafd-logo.png";
import System from "./models/system";
import { resolveDarkMode } from "./hooks/useTheme";

export const REFETCH_LOGO_EVENT = "refetch-logo";

export const LogoContext = createContext<any>(undefined);

export function LogoProvider({ children }) {
  const [logo, setLogo] = useState("");
  const [loginLogo, setLoginLogo] = useState("");
  const [isCustomLogo, setIsCustomLogo] = useState(false as any);

  async function fetchInstanceLogo() {
    const isDarkMode = resolveDarkMode();
    const fallbackLogo = isDarkMode ? OpenAfDLogoDark : OpenAfDLogo;
    const defaultLoginLogo = isDarkMode ? OpenAfDLogoDark : DefaultLoginLogo;

    try {
      const { isCustomLogo, logoURL } = await System.fetchLogo();
      if (logoURL) {
        setLogo(logoURL);
        setLoginLogo(isCustomLogo ? logoURL : defaultLoginLogo);
        setIsCustomLogo(isCustomLogo);
      } else {
        setLogo(fallbackLogo);
        setLoginLogo(defaultLoginLogo);
        setIsCustomLogo(false);
      }
    } catch {
      setLogo(fallbackLogo);
      setLoginLogo(defaultLoginLogo);
      setIsCustomLogo(false);
    }
  }

  useEffect(() => {
    fetchInstanceLogo();
    window.addEventListener(REFETCH_LOGO_EVENT, fetchInstanceLogo);
    return () => {
      window.removeEventListener(REFETCH_LOGO_EVENT, fetchInstanceLogo);
    };
  }, []);

  return (
    <LogoContext.Provider value={{ logo, setLogo, loginLogo, isCustomLogo }}>
      {children}
    </LogoContext.Provider>
  );
}
