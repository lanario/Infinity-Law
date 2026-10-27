import { createClient } from "@/lib/supabase/server";
import type { Action, Module } from "@/types/permissions";

export async function requireModuleAccess(modulo: Module, acao: Action) {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, error: "Sua sessão expirou. Entre novamente para continuar." } as const;
  }

  const [{ data: allowed, error: permissionError }, { data: escritorioId, error: officeError }] =
    await Promise.all([
      supabase.rpc("has_permission", { modulo, acao }),
      supabase.rpc("my_escritorio_id"),
    ]);

  if (permissionError || !allowed) {
    return { ok: false, error: "Seu perfil não tem permissão para esta ação." } as const;
  }

  if (officeError || !escritorioId) {
    return { ok: false, error: "Não foi possível identificar o escritório ativo." } as const;
  }

  return { ok: true, supabase, user, escritorioId } as const;
}
