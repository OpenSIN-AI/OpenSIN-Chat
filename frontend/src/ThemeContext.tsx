// SPDX-License-Identifier: MIT
import React, { createContext, useContext, useMemo } from "react";
import { useTheme } from "./hooks/useTheme";

export interface ThemeContextValue {
  theme: string;
  setTheme: (newTheme: any) => void;
  availableThemes: string[];
  isLight: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeValue = useTheme({ broadcastLogoChange: true });
  const memoizedValue = useMemo<ThemeContextValue>(
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
