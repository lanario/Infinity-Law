"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  DollarSign,
  Calendar,
  Gavel,
  MessageCircle,
  BarChart3,
  Settings,
  Wallet,
  Receipt,
  ChevronDown,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermission } from "@/hooks/use-permission";
import { useSidebar } from "@/components/layout/sidebar-context";
import type { Module } from "@/types/permissions";

export interface SubNavItem {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  modulo: Module;
  subitems?: SubNavItem[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    modulo: "dashboard",
  },
  {
    label: "Processos",
    href: "/processos",
    icon: Briefcase,
    modulo: "processos",
  },
  {
    label: "Clientes",
    href: "/clientes",
    icon: Users,
    modulo: "clientes",
  },
  {
    label: "Finanças",
    href: "/financeiro",
    icon: DollarSign,
    modulo: "financeiro",
    subitems: [
      { label: "Financeiro", href: "/financeiro", icon: Wallet },
      { label: "Honorários", href: "/financeiro#honorarios", icon: Receipt },
    ],
  },
  {
    label: "Agenda",
    href: "/agenda",
    icon: Calendar,
    modulo: "agenda",
  },
  {
    label: "Intimações",
    href: "/intimacoes",
    icon: Gavel,
    modulo: "comunicacao",
  },
  {
    label: "Comunicação",
    href: "/comunicacao",
    icon: MessageCircle,
    modulo: "comunicacao",
    subitems: [
      { label: "WhatsApp", href: "/comunicacao", icon: MessageCircle },
    ],
  },
  {
    label: "Relatórios",
    href: "/relatorios",
    icon: BarChart3,
    modulo: "relatorios",
  },
  {
    label: "Configurações",
    href: "/configuracoes",
    icon: Settings,
    modulo: "configuracoes",
  },
];



// Brand / Logo da Sidebar
function SidebarBrand({
  isCollapsed,
  isDesktop = false,
}: {
  isCollapsed: boolean;
  isDesktop?: boolean;
}) {
  if (isDesktop) {
    return (
      <Link href="/dashboard" className="flex h-full w-[280px] items-center select-none group">
        <span className="flex h-full w-[84px] shrink-0 items-center justify-center">
          <span className="relative h-9 w-9 shrink-0 transition-transform group-hover:scale-105">
            <Image src="/logo.png" alt="Infinity Law" fill className="object-contain" priority />
          </span>
        </span>
        <span
          aria-hidden={isCollapsed}
          className={cn(
            "flex h-full w-[196px] min-w-0 flex-col justify-center overflow-hidden pl-3 transition-[opacity,transform] duration-200 ease-out",
            isCollapsed ? "-translate-x-2 opacity-0" : "translate-x-0 opacity-100"
          )}
        >
          <span className="text-base font-bold leading-tight tracking-tight text-gray-900">
            Infinity <span className="text-gold">Law</span>
          </span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-gray-400">
            Sistema Jurídico
          </span>
        </span>
      </Link>
    );
  }

  return (
    <Link
      href="/dashboard"
      className={cn(
        "flex items-center gap-3 select-none group",
        isCollapsed && "justify-center"
      )}
    >
      <div className="relative h-9 w-9 shrink-0 group-hover:scale-105 transition-transform">
        <Image
          src="/logo.png"
          alt="Infinity Law"
          fill
          className="object-contain"
          priority
        />
      </div>
      {!isCollapsed && (
        <div className="min-w-0">
          <p className="text-base font-bold text-gray-900 leading-tight tracking-tight">
            Infinity <span className="text-gold">Law</span>
          </p>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium">
            Sistema Jurídico
          </p>
        </div>
      )}
    </Link>
  );
}

// Item individual: trilho desktop estável e accordions no painel/drawer.
function SidebarNavItem({
  item,
  isCollapsed,
  isDesktop = false,
  reduceMotion = false,
  onNavigate,
}: {
  item: NavItem;
  isCollapsed: boolean;
  isDesktop?: boolean;
  reduceMotion?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const canRead = usePermission(item.modulo, "read");
  const [currentHash, setCurrentHash] = useState("");

  useEffect(() => {
    const syncHash = () => setCurrentHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  const isSubRouteActive = (href: string) => {
    const hashIndex = href.indexOf("#");
    const hrefPath = hashIndex === -1 ? href : href.slice(0, hashIndex);
    const hrefHash = hashIndex === -1 ? "" : href.slice(hashIndex);
    const pathMatches = pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);

    if (!pathMatches) return false;
    if (hrefHash) return currentHash === hrefHash;
    return currentHash === "";
  };

  const hasSubitems = Boolean(item.subitems && item.subitems.length > 0);

  // Determina se a rota atual pertence a este item ou aos seus subitens
  const isDirectActive =
    pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
  const isChildActive =
    item.subitems?.some((sub) => isSubRouteActive(sub.href)) ?? false;
  const isActive = isDirectActive || isChildActive;

  // Estado de abertura do accordion
  const [isOpen, setIsOpen] = useState<boolean>(isActive && !isDesktop);

  // No drawer mobile, mantém o accordion aberto ao navegar para uma rota filha.
  // No desktop, o usuário abre o submenu explicitamente para o hover não deslocar o trilho.
  useEffect(() => {
    if (isActive && !isDesktop) {
      setIsOpen(true);
    }
  }, [isActive, isDesktop]);

  if (!canRead && item.modulo !== "dashboard") return null;

  // Desktop: keep the 84px icon rail fixed and reveal labels in the adjacent panel.
  if (isDesktop) {
    const submenuId = `sidebar-submenu-${item.href.replace(/[^a-z0-9]/gi, "-")}`;
    const rowClassName = cn(
      "group relative mt-0.5 flex h-12 w-[280px] items-center rounded-2xl text-left text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/30",
      isActive ? "text-gold-dark font-semibold" : "text-gray-600"
    );

    const rowBackground = (
      <motion.span
        aria-hidden="true"
        initial={false}
        animate={{ width: isCollapsed ? 48 : 248 }}
        transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.4, 0, 0.2, 1] }}
        className={cn(
          "pointer-events-none absolute left-[18px] top-0 z-0 h-12 rounded-2xl",
          isActive ? "bg-gold/15" : "bg-transparent group-hover:bg-gray-100/80"
        )}
      />
    );

    const iconRail = (
      <span className="relative z-10 flex h-12 w-[84px] shrink-0 items-center justify-center">
        <item.icon
          className={cn(
            "h-5 w-5 shrink-0 transition-colors",
            isActive ? "text-gold" : "text-gray-400 group-hover:text-gray-600",
            reduceMotion && "transition-none"
          )}
        />
      </span>
    );

    const labelPanel = (
      <span
        aria-hidden={isCollapsed}
        className={cn(
          "relative z-10 flex h-12 w-[196px] min-w-0 items-center overflow-hidden pl-3 pr-4 transition-[opacity,transform] duration-200 ease-out",
          isCollapsed ? "-translate-x-2 opacity-0" : "translate-x-0 opacity-100",
          reduceMotion && "transition-none"
        )}
      >
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {hasSubitems && (
          <ChevronDown
            className={cn(
              "ml-2 h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 group-hover:text-gray-600",
              isOpen && "rotate-180 text-gold",
              reduceMotion && "transition-none"
            )}
          />
        )}
      </span>
    );

    return (
      <div className="w-[280px]">
        <div className="relative flex h-[52px] w-[280px] items-start">
          {hasSubitems && item.subitems ? (
            <button
              type="button"
              onClick={() => {
                if (isCollapsed) {
                  router.push(item.href);
                  onNavigate?.();
                  return;
                }
                setIsOpen((prev) => !prev);
              }}
              aria-label={item.label}
              aria-expanded={!isCollapsed && isOpen}
              aria-controls={submenuId}
              className={rowClassName}
            >
              {rowBackground}
              {iconRail}
              {labelPanel}
            </button>
          ) : (
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={pathname === item.href ? "page" : undefined}
              aria-label={item.label}
              className={rowClassName}
            >
              {rowBackground}
              {iconRail}
              {labelPanel}
            </Link>
          )}
        </div>

        {hasSubitems && item.subitems && (
          <AnimatePresence initial={false}>
            {!isCollapsed && isOpen && (
              <motion.div
                id={submenuId}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeInOut" }}
                className="w-[280px] overflow-hidden"
              >
                <div className="ml-[34px] w-[232px] py-1">
                  <div className="space-y-1">
                    {item.subitems.map((sub) => {
                      const isSubActive = isSubRouteActive(sub.href);
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={onNavigate}
                          className={cn(
                            "flex h-10 items-center rounded-xl pr-3 text-[13px] font-medium transition-colors",
                            isSubActive
                              ? "bg-gold/15 text-gold-dark font-semibold shadow-xs"
                              : "text-gray-500 hover:bg-gray-100/70 hover:text-gray-900",
                            reduceMotion && "transition-none"
                          )}
                        >
                          <span className="flex h-10 w-12 shrink-0 items-center justify-center">
                            {sub.icon && <sub.icon className="h-4 w-4" />}
                          </span>
                          <span className="truncate pl-1">{sub.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    );
  }

  // Rail compacta com flyout para os itens que possuem submenu.
  if (isCollapsed) {
    return (
      <div className="relative group flex justify-center py-0.5">
        {hasSubitems ? (
          <button
            type="button"
            onClick={() => {
              router.push(item.href);
              onNavigate?.();
            }}
            className={cn(
              "h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-gold/30",
              isActive
                ? "bg-gold/15 text-gold-dark shadow-xs"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-100/80"
            )}
            aria-label={item.label}
          >
            <item.icon
              className={cn(
                "h-5 w-5 transition-colors",
                isActive ? "text-gold" : "text-gray-400 group-hover:text-gray-600"
              )}
            />
          </button>
        ) : (
          <Link
            href={item.href}
            onClick={onNavigate}
            aria-current={pathname === item.href ? "page" : undefined}
            aria-label={item.label}
            className={cn(
              "h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-gold/30",
              isActive
                ? "bg-gold/15 text-gold-dark shadow-xs"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-100/80"
            )}
          >
            <item.icon
              className={cn(
                "h-5 w-5 transition-colors",
                isActive ? "text-gold" : "text-gray-400 group-hover:text-gray-600"
              )}
            />
          </Link>
        )}

        {/* Flyout flutuante lateral */}
        <div className="absolute left-full top-0 ml-3 z-50 min-w-[210px] bg-white border border-gray-100 shadow-xl rounded-2xl p-2.5 invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 transition-all duration-150 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto">
          <div className="px-3 py-1.5 border-b border-gray-100 mb-1.5 flex items-center gap-2">
            <item.icon className="h-4 w-4 text-gold shrink-0" />
            <span className="text-xs font-bold text-gray-900">{item.label}</span>
          </div>

          {hasSubitems && item.subitems ? (
            <div className="space-y-1">
              {item.subitems.map((sub) => {
                const isSubActive = isSubRouteActive(sub.href);
                return (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    onClick={onNavigate}
                    className={cn(
                      "block px-3 py-1.5 rounded-xl text-xs font-medium transition-colors",
                      isSubActive
                        ? "bg-gold/15 text-gold-dark font-semibold"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/70"
                    )}
                  >
                    {sub.label}
                  </Link>
                );
              })}
            </div>
          ) : (
            <Link
              href={item.href}
              onClick={onNavigate}
              className="block px-3 py-1.5 rounded-xl text-xs font-medium text-gold hover:bg-gold-soft transition-colors"
            >
              Acessar {item.label}
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Renderização em modo expandido com Accordion
  if (hasSubitems && item.subitems) {
    return (
      <div className="py-0.5">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            "w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-150 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-gold/30",
            isActive
              ? "bg-gold/15 text-gold-dark font-semibold shadow-xs"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/80"
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <item.icon
              className={cn(
                "h-5 w-5 shrink-0 transition-colors",
                isActive ? "text-gold" : "text-gray-400 group-hover:text-gray-600"
              )}
            />
            <span className="truncate">{item.label}</span>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 transition-transform duration-200 text-gray-400 group-hover:text-gray-600",
              isOpen && "rotate-180 text-gold"
            )}
          />
        </button>

        {/* Submenu com linha conectora vertical cinza (estilo Asaas) */}
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="space-y-1 my-1 pl-3">
                {item.subitems.map((sub) => {
                  const isSubActive = isSubRouteActive(sub.href);
                  return (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all",
                        isSubActive
                          ? "bg-gold/15 text-gold-dark font-semibold shadow-xs"
                          : "text-gray-500 hover:text-gray-900 hover:bg-gray-100/70"
                      )}
                    >
                      {sub.icon && <sub.icon className="h-4 w-4 shrink-0" />}
                      <span className="truncate">{sub.label}</span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Item simples sem subitens (ex: Dashboard, Comunicação, Relatórios)
  return (
    <div className="py-0.5">
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={pathname === item.href ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-150 group",
          isActive
            ? "bg-gold/15 text-gold-dark font-semibold shadow-xs"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/80"
        )}
      >
        <item.icon
          className={cn(
            "h-5 w-5 shrink-0 transition-colors",
            isActive ? "text-gold" : "text-gray-400 group-hover:text-gray-600"
          )}
        />
        <span className="truncate">{item.label}</span>
      </Link>
    </div>
  );
}

export function Sidebar() {
  const { isMobileOpen, setIsMobileOpen } = useSidebar();
  const reduceMotion = useReducedMotion() ?? false;
  const [isPointerHovering, setIsPointerHovering] = useState(false);
  const [hasFocusWithin, setHasFocusWithin] = useState(false);
  const [isKeyboardNavigation, setIsKeyboardNavigation] = useState(false);
  const isCompact = !isPointerHovering && !hasFocusWithin;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab") setIsKeyboardNavigation(true);
    };
    const handlePointerDown = () => {
      setIsKeyboardNavigation(false);
      setHasFocusWithin(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  const handlePointerEnter = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse") setIsPointerHovering(true);
  };

  const handleFocusLeave = (event: React.FocusEvent<HTMLElement>) => {
    const nextTarget = event.relatedTarget;
    if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
      setHasFocusWithin(false);
    }
  };

  return (
    <>
      {/* ========================================================
          SIDEBAR DESKTOP (compacta, com expansão por hover/foco)
          ======================================================== */}
      <motion.aside
        initial={false}
        animate={{ width: isCompact ? 84 : 280 }}
        transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.4, 0, 0.2, 1] }}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={() => setIsPointerHovering(false)}
        onFocusCapture={() => {
          if (isKeyboardNavigation) setHasFocusWithin(true);
        }}
        onBlurCapture={handleFocusLeave}
        className="hidden lg:flex fixed left-0 top-0 h-screen bg-white border-r border-gray-100 flex-col z-30 select-none shadow-xs overflow-hidden"
      >
        {/* Topo / Brand */}
        <div className="h-20 w-full shrink-0 overflow-hidden border-b border-gray-100/80">
          <SidebarBrand isCollapsed={isCompact} isDesktop />
        </div>

        {/* Trilho fixo dos ícones e painel de rótulos à direita */}
        <nav
          className="min-h-0 w-full flex-1 space-y-1 overflow-x-hidden overflow-y-auto overscroll-y-contain py-3"
          aria-label="Navegação principal"
        >
          {NAV_ITEMS.map((item) => (
            <SidebarNavItem
              key={item.href}
              item={item}
              isCollapsed={isCompact}
              isDesktop
              reduceMotion={reduceMotion}
            />
          ))}
        </nav>
      </motion.aside>

      {/* ========================================================
          SIDEBAR MOBILE (Drawer deslizante com Backdrop escurecido)
          ======================================================== */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 lg:hidden"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMobileOpen && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: reduceMotion ? 0 : 0.25, ease: "easeInOut" }}
            className="fixed inset-y-0 left-0 w-[280px] bg-white border-r border-gray-100 flex flex-col z-50 lg:hidden shadow-2xl"
          >
            {/* Header Mobile com botão de fechar */}
            <div className="h-20 flex items-center justify-between px-5 border-b border-gray-100">
              <SidebarBrand isCollapsed={false} />
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label="Fechar menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Lista de navegação mobile */}
            <nav className="flex-1 px-3.5 py-2 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => (
                <SidebarNavItem
                  key={item.href}
                  item={item}
                  isCollapsed={false}
                  onNavigate={() => setIsMobileOpen(false)}
                />
              ))}
            </nav>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
