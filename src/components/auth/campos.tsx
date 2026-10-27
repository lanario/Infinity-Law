"use client";

import type { ReactNode } from "react";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

export const campoBase =
  "w-full rounded-xl border bg-[#161616] py-2.5 pl-10 text-sm text-[#F5F5F5] outline-none transition-all placeholder:text-[#A3A3A3]/60";

export const campoNormal =
  "border-[#2A2A2A] hover:border-[#D4AF37]/40 focus:border-[#D4AF37] focus-visible:ring-2 focus-visible:ring-[#D4AF37]/25";

export const campoComErro =
  "border-[#EF4444] focus:border-[#EF4444] focus-visible:ring-2 focus-visible:ring-[#EF4444]/25";

/** Curva de saída suave usada nos formulários de autenticação */
export const SUAVE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Entrada em cascata dos campos */
export const container: Variants = {
  animate: { transition: { staggerChildren: 0.02 } },
};

export const item: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: SUAVE } },
};

interface CampoProps {
  id: string;
  label: string;
  icone: LucideIcon;
  erro?: string | null;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}

export function Campo({
  id,
  label,
  icone: Icone,
  erro,
  hint,
  required = true,
  children,
}: CampoProps) {
  return (
    <motion.div variants={item}>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-medium text-[#A3A3A3]"
      >
        {label}
        {required && <span className="text-[#D4AF37]"> *</span>}
      </label>
      <div className="relative">
        <Icone
          aria-hidden
          className={cn(
            "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors",
            erro ? "text-[#EF4444]" : "text-[#737373]"
          )}
        />
        {children}
      </div>
      {erro ? (
        <p id={`${id}-erro`} role="alert" className="mt-1.5 text-[11px] text-[#EF4444]">
          {erro}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[11px] text-[#A3A3A3]/70">{hint}</p>
      ) : null}
    </motion.div>
  );
}

export function BotaoOlho({
  visivel,
  onToggle,
  rotulo,
}: {
  visivel: boolean;
  onToggle: () => void;
  rotulo: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={visivel ? `Ocultar ${rotulo}` : `Mostrar ${rotulo}`}
      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#A3A3A3] transition-colors hover:bg-[#262626] hover:text-[#F5F5F5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
    >
      {visivel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}
