import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { checkPermission } from "@/lib/permissions";
import type { Action, Module, PermissionsMap } from "@/types/permissions";

// Cacheados por request (React.cache): layout e páginas compartilham a mesma consulta.
export const getSessionUser = cache(async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getCurrentProfile = cache(async () => {
  const user = await getSessionUser();
  if (!user) return null;

  const supabase = createClient();
  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select(`
      id,
      nome,
      email,
      avatar_url,
      escritorio_id,
      cargo_id,
      ativo,
      cargos!usuarios_cargo_tenant_fkey (
        nome,
        is_admin,
        permissoes
      )
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!usuario) return null;

  const cargo = Array.isArray(usuario.cargos) ? usuario.cargos[0] : usuario.cargos;
  const permissoes = (cargo?.permissoes as PermissionsMap) ?? {};
  const isAdmin = cargo?.is_admin ?? false;
  const ativo = usuario.ativo !== false;

  return {
    user,
    usuario,
    cargo,
    permissoes,
    isAdmin,
    escritorioId: usuario.escritorio_id as string,
    // Espelha public.has_permission (exige usuário ativo). RLS segue como barreira real.
    can: (modulo: Module, acao: Action) => ativo && checkPermission(permissoes, modulo, acao, isAdmin),
  };
});
