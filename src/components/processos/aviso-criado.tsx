"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";

export function AvisoCriado() {
  const pathname = usePathname();
  const [visivel, setVisivel] = useState(true);

  function fechar() {
    setVisivel(false);
    window.history.replaceState(window.history.state, "", pathname); // remove ?criado=1 sem navegar
  }

  useEffect(() => {
    const timer = setTimeout(fechar, 6000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visivel) return null;
  return (
    <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
      <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="flex-1">Processo cadastrado com sucesso.</span>
      <button type="button" onClick={fechar} aria-label="Fechar aviso" className="rounded p-0.5 hover:bg-emerald-100 dark:hover:bg-emerald-500/20">
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
