// SPDX-License-Identifier: MIT
import { createContext, useEffect, useRef, useState } from "react";
import OpenAfDLogo from "./media/logo/openafd-logo.png";
import OpenAfDLogoDark from "./media/logo/openafd-logo-dark.png";
import DefaultLoginLogo from "./media/logo/openafd-logo.png";
import System from "./models/system";
import { resolveDarkMode } from "./hooks/useTheme";

export const REFETCH_LOGO_EVENT = "refetch-logo";

export const LogoContext = createContext<any>(undefined);

/**
 * Resolves the stored theme preference into a concrete dark-mode boolean.
 * Handles the legacy "default" value (treated as dark) and the "system"
 * value (resolved against the OS preference). Inlined here (rather than
 * imported from useTheme) to avoid a circular import between the two modules.
 */
function resolveDarkMode(): boolean {
  const stored = localStorage.getItem("theme");
  let theme = stored === "default" ? "dark" : stored || "system";
  if (theme === "system") {
    theme = window.matchMedia?.("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  }
  return theme !== "light";
}

export function LogoProvider({ children }) {
  const [logo, setLogo] = useState("");
  const [loginLogo, setLoginLogo] = useState("");
  const [isCustomLogo, setIsCustomLogo] = useState(false as any);
  // Tracks the most recent blob object URL so it can be revoked before a new
  // one is created (and on unmount), preventing a memory leak that would
  // otherwise grow on every theme switch / REFETCH_LOGO_EVENT.
  const objectUrlRef = useRef<string | null>(null);

  async function fetchInstanceLogo() {
    const isDarkMode = resolveDarkMode();
    const fallbackLogo = isDarkMode ? OpenAfDLogoDark : OpenAfDLogo;
    const defaultLoginLogo = isDarkMode ? OpenAfDLogoDark : DefaultLoginLogo;

    const revokePreviousObjectUrl = () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };

    try {
      const { isCustomLogo, logoURL } = await System.fetchLogo();
      revokePreviousObjectUrl();
      if (logoURL) {
        objectUrlRef.current = logoURL;
        setLogo(logoURL);
        setLoginLogo(isCustomLogo ? logoURL : defaultLoginLogo);
        setIsCustomLogo(isCustomLogo);
      } else {
        setLogo(fallbackLogo);
        setLoginLogo(defaultLoginLogo);
        setIsCustomLogo(false);
      }
    } catch {
      revokePreviousObjectUrl();
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
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  return (
    <LogoContext.Provider value={{ logo, setLogo, loginLogo, isCustomLogo }}>
      {children}
    </LogoContext.Provider>
  );
}
