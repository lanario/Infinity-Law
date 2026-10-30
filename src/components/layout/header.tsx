"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useUser } from "@/components/layout/user-context";
import { useSidebar } from "@/components/layout/sidebar-context";
import { UserMenu } from "@/components/layout/user-menu";
import { FeedbackDialog } from "@/components/layout/feedback-dialog";
import { NotificationCenter } from "@/components/layout/notification-center";

interface HeaderProps {
  title?: string;
  actions?: React.ReactNode;
}

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(interval);
  }, [intervalMs]);
  return now;
}

function HeaderGreeting({ firstName }: { firstName: string }) {
  const hour = useNow(60_000).getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  return (
    <h1 className="truncate text-base font-black leading-tight tracking-tight text-[#17191a] dark:text-zinc-100 sm:text-xl">
      {greeting}, {firstName}
    </h1>
  );
}

const timeFormatter = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

function HeaderClock() {
  const now = useNow(30_000);
  return (
    <time className="text-sm font-black tabular-nums tracking-[0.12em] text-[#17191a] dark:text-zinc-100">
      {timeFormatter.format(now)}
    </time>
  );
}

export function Header({ title, actions }: HeaderProps) {
  const user = useUser();
  const { setIsMobileOpen } = useSidebar();
  const firstName = user?.nome?.split(" ")[0] ?? "";

  return (
    <header className="infinity-header sticky top-0 z-20 h-[72px] border-b border-stone-200/90 bg-[#fcfcfb]/90 backdrop-blur-xl dark:border-zinc-800/90 dark:bg-[#141618]/90">
      <div className="relative flex h-full items-center justify-between gap-3 px-3 sm:px-5 lg:px-7">
        <div className="infinity-header-grid" aria-hidden="true" />

        <div className="relative flex min-w-0 items-center gap-2.5 sm:gap-3">
          {/* Botão de Menu Hamburger para Mobile */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            className="-ml-1 rounded-xl p-2 text-gray-500 transition-colors hover:bg-gold-soft hover:text-gold-dark focus:outline-none focus:ring-2 focus:ring-gold/25 dark:text-zinc-400 dark:hover:bg-gold/15 dark:hover:text-[#E5C158] lg:hidden"
            aria-label="Abrir menu lateral"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            {title ? (
              <h1 className="truncate text-base font-black leading-tight tracking-tight text-[#17191a] dark:text-zinc-100 sm:text-xl">
                {title}
              </h1>
            ) : (
              <>
                <HeaderGreeting firstName={firstName} />
                <p className="mt-0.5 hidden text-[10px] font-bold uppercase tracking-[0.16em] text-stone-400 dark:text-zinc-500 sm:block">
                  Painel de gestão jurídica
                </p>
              </>
            )}
          </div>
        </div>

        <div className="relative flex shrink-0 items-center gap-1.5 sm:gap-2">
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="hidden items-center gap-2 rounded-2xl border border-stone-200 bg-white/80 px-3 py-2 shadow-[0_8px_20px_-18px_rgba(23,25,26,0.7)] dark:border-zinc-800 dark:bg-zinc-900/80 sm:flex"
          title="Horário atual"
        >
          <span className="relative flex h-5 w-5 items-center justify-center rounded-full bg-gold/15">
            <span className="h-2 w-2 rounded-full bg-gold animate-pulse-amber" />
          </span>
          <HeaderClock />
        </motion.div>

        {actions}

        <NotificationCenter />
        <FeedbackDialog />

        <UserMenu />

        </div>
      </div>
    </header>
  );
}

export function NewButton({
  label,
  onClick,
  href,
}: {
  label: string;
  onClick?: () => void;
  href?: string;
}) {
  const cls =
    "flex items-center gap-1.5 px-3 py-1.5 bg-gold text-white text-sm font-medium rounded-xl hover:bg-gold-hover shadow-xs transition-colors";
  if (href) {
    return (
      <Link href={href} className={cls}>
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </Link>
    );
  }
  return (
    <button onClick={onClick} className={cls}>
      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}
