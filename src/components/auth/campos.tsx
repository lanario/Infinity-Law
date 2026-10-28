"use client";

import type { ReactNode } from "react";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

export const campoBase =
  "auth-field w-full rounded-xl border py-2.5 pl-10 text-sm outline-none transition-all";

export const campoNormal = "auth-field-normal";

export const campoComErro =
  "auth-field-error";

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
        className="auth-field-label mb-1.5 block text-xs font-medium"
      >
        {label}
        {required && <span className="auth-field-required"> *</span>}
      </label>
      <div className="relative">
        <Icone
          aria-hidden
          className={cn(
            "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors",
            erro ? "text-[#B42318]" : "auth-field-icon"
          )}
        />
        {children}
      </div>
      {erro ? (
        <p id={`${id}-erro`} role="alert" className="mt-1.5 text-[11px] text-[#B42318]">
          {erro}
        </p>
      ) : hint ? (
        <p className="auth-field-hint mt-1.5 text-[11px]">{hint}</p>
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
      className="auth-eye-button absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A77D16]"
    >
      {visivel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}
