"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModuleAccess } from "@/lib/server/module-access";
import { runWithRequiredAccess } from "@/lib/server/required-access";

export async function marcarMovimentacoesVistas(processoId: string): Promise<{ error: string } | { ok: true }> {
  if (!z.string().uuid().safeParse(processoId).success) return { error: "Processo inválido." };
  return runWithRequiredAccess(
    () => requireModuleAccess("processos", "read"),
    (error) => ({ error }),
    async ({ supabase, escritorioId }) => {
      const { error } = await supabase
        .from("processo_movimentacoes")
        .update({ visto_em: new Date().toISOString() })
        .eq("processo_id", processoId)
        .eq("escritorio_id", escritorioId)
        .is("visto_em", null);
      if (error) {
        console.error("[marcarMovimentacoesVistas] falha:", error);
        return { error: "Não foi possível marcar as movimentações como vistas." };
      }
      revalidatePath(`/processos/${processoId}`);
      return { ok: true };
    },
  );
}
