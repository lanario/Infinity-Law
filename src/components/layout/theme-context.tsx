"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ColorTheme = "light" | "dark";

type ThemeContextValue = {
  theme: ColorTheme;
  setTheme: (theme: ColorTheme) => void;
};

const STORAGE_KEY = "infinity-law:theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ColorTheme>("light");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark") setTheme(stored);
    } catch {
      // A preferência continua funcionando nesta sessão mesmo sem acesso ao storage.
    }
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;

    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // A preferência fica em memória até o fim desta sessão.
    }
  }, [isReady, theme]);

  useEffect(() => () => document.documentElement.classList.remove("dark"), []);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme deve ser usado dentro de ThemeProvider");
  return context;
}
