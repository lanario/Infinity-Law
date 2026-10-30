"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Briefcase, Clock, Plus, Scale, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface QuickDockProps {
  className?: string;
  position?: "bottom" | "inline";
}

const createItems = [
  { label: "Novo processo", href: "/processos/novo", icon: Briefcase },
  { label: "Novo prazo", href: "/agenda?novo=prazo", icon: Clock },
  { label: "Novo cliente", href: "/clientes?novo=true", icon: UserPlus },
  { label: "Nova audiência", href: "/agenda?novo=audiencia", icon: Scale },
];

export function QuickDock({ className, position = "bottom" }: QuickDockProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const createRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (createRef.current && !createRef.current.contains(event.target as Node)) {
        setIsCreateOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsCreateOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <aside
      aria-label="Criar registro"
      className={cn(
        position === "bottom" ? "fixed bottom-5 right-5 z-40 sm:bottom-7 sm:right-7" : "relative",
        "select-none",
        className
      )}
    >
      <div ref={createRef} className="group relative">
        <button
          type="button"
          onClick={() => setIsCreateOpen((open) => !open)}
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full border border-[#17191a]/10 bg-[#D4AF37] text-neutral-950 dark:text-neutral-950 shadow-[0_12px_30px_rgba(0,0,0,0.22),0_1px_0_rgba(255,255,255,0.45)_inset] transition-[transform,background-color] duration-150 hover:-translate-y-0.5 hover:scale-105 hover:bg-[#C9A227] active:scale-95 focus:outline-none focus:ring-4 focus:ring-[#D4AF37]/25",
            isCreateOpen && "rotate-45"
          )}
          aria-label={isCreateOpen ? "Fechar menu de novo registro" : "Novo registro"}
          aria-expanded={isCreateOpen}
          aria-haspopup="menu"
        >
          <Plus className="h-6 w-6 stroke-[2.5]" aria-hidden="true" />
        </button>

        <AnimatePresence>
          {isCreateOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              className="absolute bottom-[calc(100%+0.75rem)] right-0 z-50 w-60 origin-bottom-right rounded-2xl border border-white/15 bg-[#17191a] p-2 text-left shadow-[0_20px_50px_rgba(0,0,0,0.35)]"
              role="menu"
              aria-label="Novo registro"
            >
              <p className="border-b border-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Novo registro
              </p>
              <div className="mt-1 space-y-0.5">
                {createItems.map(({ label, href, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setIsCreateOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs text-gray-200 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                    role="menuitem"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#D4AF37]/15 text-[#D4AF37]">
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    {label}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}

export default QuickDock;
