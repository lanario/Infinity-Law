"use client";

import { useEffect } from "react";
import { marcarMovimentacoesVistas } from "@/app/actions/movimentacoes";

// Atraso curto para o usuário enxergar os selos "Novo" antes de a página revalidar.
export function MarcarMovimentacoesVistas({ processoId }: { processoId: string }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      void marcarMovimentacoesVistas(processoId);
    }, 5000);
    return () => clearTimeout(timer);
  }, [processoId]);
  return null;
}
