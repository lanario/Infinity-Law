"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { MotionConfig } from "framer-motion";

export type PerformanceMode = "auto" | "on" | "off";

type PerformanceModeContextValue = {
  mode: PerformanceMode;
  setMode: (mode: PerformanceMode) => void;
};

const STORAGE_KEY = "infinity-law:performance-mode";
const PerformanceModeContext = createContext<PerformanceModeContextValue | null>(null);

function hasLowPerformanceDevice() {
  if (typeof window === "undefined") return false;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const cores = navigator.hardwareConcurrency;

  return reducedMotion || (typeof deviceMemory === "number" && deviceMemory <= 4) || (cores > 0 && cores <= 4);
}

export function PerformanceModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<PerformanceMode>("auto");
  const [isReady, setIsReady] = useState(false);
  const [autoEnabled, setAutoEnabled] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "auto" || stored === "on" || stored === "off") setMode(stored);
    setAutoEnabled(hasLowPerformanceDevice());
    setIsReady(true);

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateAuto = () => setAutoEnabled(hasLowPerformanceDevice());
    media.addEventListener("change", updateAuto);
    return () => media.removeEventListener("change", updateAuto);
  }, []);

  const reduceMotion = mode === "on" || (mode === "auto" && autoEnabled);

  useEffect(() => {
    if (!isReady) return;
    window.localStorage.setItem(STORAGE_KEY, mode);
    document.documentElement.dataset.performanceMode = reduceMotion ? "on" : "off";
  }, [isReady, mode, reduceMotion]);

  const value = useMemo(() => ({ mode, setMode }), [mode]);

  return (
    <PerformanceModeContext.Provider value={value}>
      <MotionConfig reducedMotion={reduceMotion ? "always" : "never"}>
        {children}
      </MotionConfig>
    </PerformanceModeContext.Provider>
  );
}

export function usePerformanceMode() {
  const context = useContext(PerformanceModeContext);
  if (!context) throw new Error("usePerformanceMode deve ser usado dentro de PerformanceModeProvider");
  return context;
}
