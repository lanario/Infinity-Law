"use server";

import { z } from "zod";
import { MODULES, ACTIONS } from "@/types/permissions";
import { requireModuleAccess } from "@/lib/server/module-access";
import { logAudit } from "@/lib/audit";

const permissionsSchema = z.record(z.string(), z.object({ read: z.boolean().optional(), write: z.boolean().optional(), delete: z.boolean().optional() })).refine(
  (value) => Object.keys(value).every((module) => MODULES.includes(module as (typeof MODULES)[number])),
  "Módulo de permissão inválido."
);

export async function salvarPermissoesCargo(cargoId: string, permissoes: unknown): Promise<{ error: string } | { success: true }> {
  const access = await requireModuleAccess("configuracoes", "write");
  if (!access.ok) return { error: access.error };
  const id = z.string().uuid().safeParse(cargoId);
  const parsed = permissionsSchema.safeParse(permissoes);
  if (!id.success || !parsed.success) return { error: "Revise o cargo e suas permissões." };
  const { data: ownCargo } = await access.supabase.from("usuarios").select("id").eq("id", access.user.id).eq("cargo_id", id.data).maybeSingle();
  if (ownCargo) return { error: "Seu próprio cargo não pode ser alterado por esta tela." };
  for (const moduleName of Object.keys(parsed.data)) {
    for (const action of Object.keys(parsed.data[moduleName] ?? {})) {
      if (!ACTIONS.includes(action as (typeof ACTIONS)[number])) return { error: "Ação de permissão inválida." };
    }
  }
  const { data: cargo, error } = await access.supabase.from("cargos").update({ permissoes: parsed.data }).eq("id", id.data).eq("escritorio_id", access.escritorioId).eq("is_admin", false).select("id, nome").maybeSingle();
  if (error || !cargo) return { error: "Não foi possível atualizar este cargo. Cargos administradores não podem ser limitados por aqui." };
  await logAudit({ escritorioId: access.escritorioId, usuarioId: access.user.id, tabela: "cargos", registroId: cargo.id, acao: "update", dadosNovos: { permissaoCount: Object.keys(parsed.data).length } });
  return { success: true };
}

export async function salvarAcessoUsuario(usuarioId: string, input: { cargo_id: string | null; ativo: boolean }): Promise<{ error: string } | { success: true }> {
  const access = await requireModuleAccess("configuracoes", "write");
  if (!access.ok) return { error: access.error };
  const id = z.string().uuid().safeParse(usuarioId);
  const parsed = z.object({ cargo_id: z.string().uuid().nullable(), ativo: z.boolean() }).safeParse(input);
  if (!id.success || !parsed.success) return { error: "Revise o usuário e o cargo selecionado." };
  const [{ data: usuarioAtual }, { data: novoCargo }] = await Promise.all([
    access.supabase.from("usuarios").select("id, cargo_id").eq("id", id.data).eq("escritorio_id", access.escritorioId).maybeSingle(),
    parsed.data.cargo_id
      ? access.supabase.from("cargos").select("id, is_admin").eq("id", parsed.data.cargo_id).eq("escritorio_id", access.escritorioId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (!usuarioAtual) return { error: "Usuário não encontrado neste escritório." };
  if (parsed.data.cargo_id && !novoCargo) return { error: "O cargo selecionado não pertence a este escritório." };
  if (novoCargo?.is_admin) return { error: "Não é possível conceder acesso administrativo por esta tela." };
  if (id.data === access.user.id && (!parsed.data.ativo || parsed.data.cargo_id !== usuarioAtual.cargo_id)) return { error: "Seu próprio acesso e cargo não podem ser alterados por esta tela." };
  if (usuarioAtual.cargo_id) {
    const { data: cargoAtual } = await access.supabase.from("cargos").select("is_admin").eq("id", usuarioAtual.cargo_id).maybeSingle();
    if (cargoAtual?.is_admin) return { error: "A conta administrativa não pode ser editada por esta tela." };
  }
  const { data: usuario, error } = await access.supabase.from("usuarios").update(parsed.data).eq("id", id.data).eq("escritorio_id", access.escritorioId).select("id, nome").maybeSingle();
  if (error || !usuario) return { error: "Não foi possível atualizar o acesso deste usuário." };
  await logAudit({ escritorioId: access.escritorioId, usuarioId: access.user.id, tabela: "usuarios", registroId: usuario.id, acao: "update", dadosNovos: { cargo_id: parsed.data.cargo_id, ativo: parsed.data.ativo } });
  return { success: true };
}
