// SPDX-License-Identifier: MIT
import { createContext, useEffect, useRef, useState } from "react";
import OpenSINLogo from "./media/logo/opensin-logo.png";
import OpenSINLogoDark from "./media/logo/opensin-logo-dark.png";
import DefaultLoginLogo from "./media/logo/opensin-logo.png";
import System from "./models/system";

export const REFETCH_LOGO_EVENT = "refetch-logo";

export const LogoContext = createContext<any>(undefined);

export function LogoProvider({ children }) {
  const [logo, setLogo] = useState("");
  const [loginLogo, setLoginLogo] = useState("");
  const [isCustomLogo, setIsCustomLogo] = useState(false as any);
  // Tracks the most recently created blob: object URL so it can be revoked
  // before being replaced (e.g. on theme change / REFETCH_LOGO_EVENT) and on
  // unmount, preventing object-URL memory leaks.
  const objectURLRef = useRef<string | null>(null);

  async function fetchInstanceLogo() {
    const isDarkMode =
      (localStorage.getItem("theme") || "default") === "default";
    const fallbackLogo = isDarkMode ? OpenSINLogoDark : OpenSINLogo;
    const defaultLoginLogo = isDarkMode ? OpenSINLogoDark : DefaultLoginLogo;

    try {
      const { isCustomLogo, logoURL } = await System.fetchLogo();
      // Release the previously created blob URL before storing the new one.
      if (objectURLRef.current && objectURLRef.current !== logoURL) {
        URL.revokeObjectURL(objectURLRef.current);
        objectURLRef.current = null;
      }
      if (logoURL) {
        objectURLRef.current = logoURL;
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
      if (objectURLRef.current) {
        URL.revokeObjectURL(objectURLRef.current);
        objectURLRef.current = null;
      }
    };
  }, []);

  return (
    <LogoContext.Provider value={{ logo, setLogo, loginLogo, isCustomLogo }}>
      {children}
    </LogoContext.Provider>
  );
}
