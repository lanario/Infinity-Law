"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

interface SidebarContextType {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  toggleMobile: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);
  const pathname = usePathname();

  // Fecha o drawer mobile ao navegar entre rotas
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const toggleMobile = useCallback(() => setIsMobileOpen((prev) => !prev), []);
  const value = useMemo(
    () => ({ isMobileOpen, setIsMobileOpen, toggleMobile }),
    [isMobileOpen, toggleMobile],
  );

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarContextType {
  const context = useContext(SidebarContext);
  if (!context) {
    // Retorna fallback gracioso caso o componente seja renderizado fora do provider
    return {
      isMobileOpen: false,
      setIsMobileOpen: () => {},
      toggleMobile: () => {},
    };
  }
  return context;
}
