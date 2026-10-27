"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Circle, X } from "lucide-react";
import { forcaDaSenha } from "@/lib/senha";
import { cn } from "@/lib/utils";

const BARRAS = [1, 2, 3, 4];

interface PasswordStrengthProps {
  senha: string;
  /** Senha de referência para conferir igualdade (campo de confirmação) */
  comparar?: string;
  /** Exibe somente as barras compactas */
  compacto?: boolean;
  id?: string;
}

export function PasswordStrength({ senha, comparar, compacto, id }: PasswordStrengthProps) {
  const semMovimento = useReducedMotion();
  const forca = forcaDaSenha(senha);

  const conferindo = comparar !== undefined;
  const conferem = conferindo && senha.length > 0 && senha === comparar;
  const divergem = conferindo && senha.length > 0 && senha !== comparar;

  return (
    <div id={id} className="mt-2">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1" aria-hidden>
          {BARRAS.map((barra) => {
            const aceso = forca.nivel >= barra;
            return (
              <span
                key={barra}
                className="h-1 flex-1 overflow-hidden rounded-full bg-[#262626]"
              >
                <motion.span
                  className="block h-full origin-left rounded-full"
                  style={{ backgroundColor: forca.cor }}
                  initial={false}
                  animate={{ scaleX: aceso ? 1 : 0 }}
                  transition={
                    semMovimento ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }
                  }
                />
              </span>
            );
          })}
        </div>

        <span
          role="status"
          className="w-16 shrink-0 text-right text-[11px] font-medium"
          style={{ color: forca.cor }}
        >
          {forca.rotulo}
        </span>
      </div>

      <AnimatePresence initial={false}>
        {conferindo && (conferem || divergem) && (
          <motion.p
            initial={semMovimento ? { opacity: 0 } : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={semMovimento ? { opacity: 0 } : { opacity: 0, y: -4 }}
            className={cn(
              "mt-2 flex items-center gap-1.5 text-[11px]",
              conferem ? "text-[#34D399]" : "text-[#EF4444]"
            )}
          >
            {conferem ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            {conferem ? "As senhas conferem." : "As senhas não são iguais."}
          </motion.p>
        )}
      </AnimatePresence>

      {!compacto && (
        <ul className="mt-2.5 grid gap-1 sm:grid-cols-2">
          {forca.requisitos.map((requisito) => (
            <li
              key={requisito.id}
              className={cn(
                "flex items-center gap-1.5 text-[11px] transition-colors",
                requisito.ok
                  ? "text-[#34D399]"
                  : requisito.obrigatorio
                    ? "text-[#A3A3A3]"
                    : "text-[#737373]"
              )}
            >
              {requisito.ok ? (
                <Check className="h-3 w-3 shrink-0 text-[#34D399]" />
              ) : (
                <Circle className="h-3 w-3 shrink-0 text-[#525252]" />
              )}
              {requisito.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
