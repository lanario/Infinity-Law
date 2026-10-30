"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Gauge, Layers3, LogOut, Moon, Sun, UserRound, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ProfileAvatar } from "@/components/layout/profile-avatar";
import { PerfilWorkspace } from "@/components/perfil/perfil-workspace";
import { usePerformanceMode, type PerformanceMode } from "@/components/layout/performance-mode-context";
import { useTheme, type ColorTheme } from "@/components/layout/theme-context";
import { useUser } from "@/components/layout/user-context";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const MODE_OPTIONS: { value: PerformanceMode; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "on", label: "Ligado" },
  { value: "off", label: "Desligado" },
];

const THEME_OPTIONS: { value: ColorTheme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
];

export function UserMenu() {
  const user = useUser();
  const router = useRouter();
  const { mode, setMode } = usePerformanceMode();
  const { theme, setTheme } = useTheme();
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const initials = user?.nome
    ?.trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() ?? "";

  async function logout() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const { error } = await createClient().auth.signOut();
      if (error) {
        setSigningOut(false);
        return;
      }
    } catch {
      setSigningOut(false);
      return;
    }
    setOpen(false);
    router.replace("/login");
    router.refresh();
  }

  return (
    <div ref={menuRef} className="relative ml-0.5 sm:ml-1">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="group flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-gold/70 bg-[#17191a] p-0.5 shadow-[0_6px_16px_-10px_rgba(23,25,26,0.85)] transition-[transform,border-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:border-gold hover:shadow-[0_10px_24px_-12px_rgba(23,25,26,0.55)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/20"
        title={user?.nome ?? "Perfil"}
        aria-label={`Abrir menu de ${user?.nome ?? "perfil"}`}
        aria-expanded={open}
        aria-controls="user-menu-panel"
      >
        <ProfileAvatar
          path={user?.avatar_path}
          url={user?.avatar_url}
          initials={initials}
          name={user?.nome ?? "Usuário"}
          className="h-full w-full text-[11px]"
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id="user-menu-panel"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.98 }}
            transition={{ duration: 0.17, ease: [0.22, 1, 0.36, 1] }}
            className="dashboard-root absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(28rem,calc(100vw-1.5rem))] origin-top-right overflow-hidden rounded-3xl border border-stone-200/90 bg-white shadow-[0_24px_70px_-28px_rgba(23,25,26,0.4)] dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-center gap-3.5 border-b border-stone-100 px-5 py-4 dark:border-zinc-800">
              <ProfileAvatar
                path={user?.avatar_path}
                url={user?.avatar_url}
                initials={initials}
                name={user?.nome ?? "Usuário"}
                className="h-12 w-12 border-2 border-gold/20 text-sm"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-[#17191a] dark:text-zinc-100">{user?.nome ?? "Usuário"}</p>
                <p className="mt-0.5 truncate text-xs font-semibold text-gold-dark dark:text-[#E5C158]">{user?.cargo_nome ?? "Perfil do escritório"}</p>
                <p className="mt-0.5 truncate text-xs text-stone-500 dark:text-zinc-400">{user?.email ?? ""}</p>
              </div>
            </div>

            <nav aria-label="Atalhos do perfil" className="space-y-1 p-2.5">
              <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={profileOpen}
                onClick={() => {
                  setOpen(false);
                  setProfileOpen(true);
                }}
                className="group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-gold-soft/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 dark:hover:bg-zinc-800/80"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-stone-600 transition-colors group-hover:bg-white group-hover:text-gold-dark dark:bg-zinc-800 dark:text-zinc-300 dark:group-hover:bg-zinc-700 dark:group-hover:text-[#E5C158]">
                  <UserRound className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-[#17191a] dark:text-zinc-100">Perfil</span>
                  <span className="mt-0.5 block truncate text-[11px] text-stone-400">Dados da conta e foto de perfil</span>
                </span>
              </button>
              <Link
                href="/planos"
                onClick={() => setOpen(false)}
                className="group flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-gold-soft/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 dark:hover:bg-zinc-800/80"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-stone-600 transition-colors group-hover:bg-white group-hover:text-gold-dark dark:bg-zinc-800 dark:text-zinc-300 dark:group-hover:bg-zinc-700 dark:group-hover:text-[#E5C158]">
                  <Layers3 className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-[#17191a] dark:text-zinc-100">Planos</span>
                  <span className="mt-0.5 block truncate text-[11px] text-stone-400">Consulte o plano do escritório</span>
                </span>
              </Link>
            </nav>

            <section aria-labelledby="theme-menu-title" className="border-t border-stone-100 px-4 py-4 dark:border-zinc-800">
              <div className="flex items-center gap-2 px-1">
                <Sun className="h-4 w-4 text-stone-500 dark:text-zinc-400" aria-hidden="true" />
                <h2 id="theme-menu-title" className="text-sm font-bold text-[#17191a] dark:text-zinc-100">Tema</h2>
              </div>
              <div role="group" aria-labelledby="theme-menu-title" className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1 dark:bg-zinc-800">
                {THEME_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTheme(option.value)}
                      aria-pressed={theme === option.value}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60",
                        theme === option.value
                          ? "bg-white text-[#17191a] shadow-sm dark:bg-zinc-700 dark:text-white"
                          : "text-stone-500 hover:text-stone-800 dark:text-zinc-400 dark:hover:text-zinc-100",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </section>

            <section aria-labelledby="performance-menu-title" className="border-t border-stone-100 px-4 py-4 dark:border-zinc-800">
              <div className="flex items-center gap-2 px-1">
                <Gauge className="h-4 w-4 text-stone-500 dark:text-zinc-400" aria-hidden="true" />
                <h2 id="performance-menu-title" className="text-sm font-bold text-[#17191a] dark:text-zinc-100">Modo desempenho</h2>
              </div>
              <div role="group" aria-label="Nível do modo desempenho" className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-stone-100 p-1 dark:bg-zinc-800">
                {MODE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMode(option.value)}
                    aria-pressed={mode === option.value}
                    className={cn(
                      "rounded-lg px-2 py-2 text-xs font-semibold transition-colors duration-150",
                      mode === option.value
                        ? "bg-white text-[#17191a] shadow-sm dark:bg-zinc-700 dark:text-white"
                        : "text-stone-500 hover:text-stone-800 dark:text-zinc-400 dark:hover:text-zinc-100",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 px-1 text-[11px] leading-relaxed text-stone-500 dark:text-zinc-400">
                {mode === "auto" ? "Reduz efeitos automaticamente em dispositivos mais simples." : mode === "on" ? "Reduz animações e efeitos visuais." : "Mantém animações e efeitos visuais ativos."}
              </p>
            </section>

            <div className="border-t border-stone-100 p-2.5 dark:border-zinc-800">
              <button
                type="button"
                onClick={logout}
                disabled={signingOut}
                className="flex h-11 w-full items-center gap-3 rounded-2xl px-3 text-sm font-bold text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                {signingOut ? "Saindo..." : "Sair"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent
          showCloseButton={false}
          className="dashboard-root flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-3xl border border-stone-200/90 bg-[#F4F4F6] p-0 shadow-[0_30px_100px_-25px_rgba(23,25,26,0.42)] sm:max-h-[min(92dvh,56rem)] sm:max-w-2xl dark:border-zinc-800 dark:bg-zinc-950"
        >
          <header className="flex shrink-0 items-center justify-between border-b border-stone-100 bg-white/95 px-4 py-3.5 sm:px-6 sm:py-4 dark:border-zinc-800 dark:bg-zinc-900/95">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/15 bg-gold-soft text-gold-dark">
                <UserRound className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <DialogTitle className="text-base font-black text-[#17191a] sm:text-lg dark:text-zinc-100">Meu perfil</DialogTitle>
                <p className="mt-0.5 truncate text-[11px] text-stone-500 sm:text-xs dark:text-zinc-400">Dados da conta e foto de perfil</p>
              </div>
            </div>
            <DialogClose
              aria-label="Fechar perfil"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-stone-500 transition hover:bg-stone-100 hover:text-[#17191a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </DialogClose>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5 lg:p-6">
            <PerfilWorkspace presentation="modal" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
