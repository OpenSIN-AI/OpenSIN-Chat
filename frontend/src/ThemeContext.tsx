// SPDX-License-Identifier: MIT
import React, { createContext, useContext, useMemo } from "react";
import { useTheme } from "./hooks/useTheme";

const ThemeContext = createContext<any>(undefined);

export function ThemeProvider({ children }) {
  const themeValue = useTheme({ broadcastLogoChange: true });
  const memoizedValue = useMemo(
    () => themeValue,
    [themeValue.theme, themeValue.isLight, themeValue.setTheme],
  );

  return (
    <ThemeContext.Provider value={memoizedValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  return useContext(ThemeContext);
}
