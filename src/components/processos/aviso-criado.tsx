"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";

export function AvisoCriado() {
  const router = useRouter();
  const pathname = usePathname();
  const [visivel, setVisivel] = useState(true);

  function fechar() {
    setVisivel(false);
    router.replace(pathname, { scroll: false }); // remove ?criado=1
  }

  useEffect(() => {
    const timer = setTimeout(fechar, 6000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visivel) return null;
  return (
    <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">
      <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="flex-1">Processo cadastrado com sucesso.</span>
      <button type="button" onClick={fechar} aria-label="Fechar aviso" className="rounded p-0.5 hover:bg-emerald-100">
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
