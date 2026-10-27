"use server";

import { z } from "zod";
import { requireModuleAccess } from "@/lib/server/module-access";
import { logAudit } from "@/lib/audit";

const templateSchema = z.object({
  nome: z.string().trim().min(2, "Informe um nome para o modelo.").max(80),
  categoria: z.string().trim().max(60).optional().nullable(),
  corpo: z.string().trim().min(3, "Escreva o conteúdo do modelo.").max(4096),
});

type TemplateResult = { error: string } | { success: true; id: string };

export async function salvarTemplate(input: unknown, templateId?: string): Promise<TemplateResult> {
  const access = await requireModuleAccess("comunicacao", "write");
  if (!access.ok) return { error: access.error };
  const parsed = templateSchema.safeParse(input);
  const id = templateId ? z.string().uuid().safeParse(templateId) : null;
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revise o modelo." };
  if (id && !id.success) return { error: "Identificador de modelo inválido." };

  const payload = { nome: parsed.data.nome, categoria: parsed.data.categoria?.trim() || null, corpo: parsed.data.corpo, ativo: true };
  const query = templateId
    ? access.supabase.from("whatsapp_templates").update(payload).eq("id", templateId).eq("escritorio_id", access.escritorioId).select("id").maybeSingle()
    : access.supabase.from("whatsapp_templates").insert({ ...payload, escritorio_id: access.escritorioId }).select("id").single();
  const { data, error } = await query;
  if (error || !data) return { error: "Não foi possível salvar o modelo. Tente novamente." };

  await logAudit({ escritorioId: access.escritorioId, usuarioId: access.user.id, tabela: "whatsapp_templates", registroId: data.id, acao: templateId ? "update" : "insert", dadosNovos: { nome: payload.nome, ativo: true } });
  return { success: true, id: data.id };
}

export async function arquivarTemplate(templateId: string): Promise<{ error: string } | { success: true }> {
  const access = await requireModuleAccess("comunicacao", "write");
  if (!access.ok) return { error: access.error };
  const parsed = z.string().uuid().safeParse(templateId);
  if (!parsed.success) return { error: "Identificador de modelo inválido." };
  const { data, error } = await access.supabase.from("whatsapp_templates").update({ ativo: false }).eq("id", parsed.data).eq("escritorio_id", access.escritorioId).select("id").maybeSingle();
  if (error || !data) return { error: "Não foi possível arquivar o modelo." };
  await logAudit({ escritorioId: access.escritorioId, usuarioId: access.user.id, tabela: "whatsapp_templates", registroId: data.id, acao: "update", dadosNovos: { ativo: false } });
  return { success: true };
}
