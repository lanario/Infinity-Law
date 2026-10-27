"use server";

import { logAudit } from "@/lib/audit";
import { requireModuleAccess } from "@/lib/server/module-access";
import { eventoSchema } from "@/lib/validations/evento.schema";
import { z } from "zod";

type SalvarEventoResult = { error: string } | { eventoId: string };

export async function salvarEvento(input: unknown, eventoId?: string): Promise<SalvarEventoResult> {
  const access = await requireModuleAccess("agenda", "write");
  if (!access.ok) return { error: access.error };

  const parsed = eventoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revise os dados do evento." };
  if (eventoId && !z.string().uuid().safeParse(eventoId).success) return { error: "Identificador do evento inválido." };

  const data = parsed.data;
  const inicio = new Date(data.inicio);
  const fim = data.fim ? new Date(data.fim) : null;
  if (!Number.isFinite(inicio.getTime()) || (fim && !Number.isFinite(fim.getTime()))) {
    return { error: "Informe uma data e horário válidos." };
  }
  if (fim && fim <= inicio) return { error: "O término deve ocorrer depois do início." };

  if (data.cliente_id) {
    const { data: cliente } = await access.supabase
      .from("clientes")
      .select("id")
      .eq("id", data.cliente_id)
      .eq("escritorio_id", access.escritorioId)
      .maybeSingle();
    if (!cliente) return { error: "O cliente selecionado não está disponível neste escritório." };
  }

  if (data.processo_id) {
    const { data: processo } = await access.supabase
      .from("processos")
      .select("id")
      .eq("id", data.processo_id)
      .eq("escritorio_id", access.escritorioId)
      .maybeSingle();
    if (!processo) return { error: "O processo selecionado não está disponível neste escritório." };
  }

  if (data.responsavel_id) {
    const { data: responsavel } = await access.supabase
      .from("usuarios")
      .select("id, ativo")
      .eq("id", data.responsavel_id)
      .eq("escritorio_id", access.escritorioId)
      .maybeSingle();
    if (!responsavel) return { error: "O responsável selecionado não está disponível neste escritório." };

    if (!responsavel.ativo) {
      let existingResponsavelId: string | null = null;
      if (eventoId) {
        const { data: existingEvent } = await access.supabase
          .from("eventos")
          .select("responsavel_id")
          .eq("id", eventoId)
          .eq("escritorio_id", access.escritorioId)
          .maybeSingle();
        existingResponsavelId = existingEvent?.responsavel_id ?? null;
      }
      if (existingResponsavelId !== data.responsavel_id) {
        return { error: "Só é possível atribuir eventos a membros ativos do escritório." };
      }
    }
  }

  const payload = {
    titulo: data.titulo.trim(),
    tipo: data.tipo,
    descricao: data.descricao?.trim() || null,
    inicio: inicio.toISOString(),
    fim: fim?.toISOString() ?? null,
    dia_inteiro: data.dia_inteiro,
    processo_id: data.processo_id || null,
    cliente_id: data.cliente_id || null,
    responsavel_id: data.responsavel_id || null,
    local: data.local?.trim() || null,
    link_videoconf: data.link_videoconf?.trim() || null,
  };

  const query = eventoId
    ? access.supabase
        .from("eventos")
        .update(payload)
        .eq("id", eventoId)
        .eq("escritorio_id", access.escritorioId)
        .select("id")
        .maybeSingle()
    : access.supabase
        .from("eventos")
        .insert({ ...payload, escritorio_id: access.escritorioId, criado_por: access.user.id })
        .select("id")
        .single();

  const { data: evento, error } = await query;
  if (error || !evento) {
    console.error("[salvarEvento] Falha ao salvar evento:", error);
    return { error: "Não foi possível salvar o evento. Verifique os dados e tente novamente." };
  }

  await logAudit({
    escritorioId: access.escritorioId,
    usuarioId: access.user.id,
    tabela: "eventos",
    registroId: evento.id,
    acao: eventoId ? "update" : "insert",
    dadosNovos: { tipo: data.tipo, clienteId: data.cliente_id ?? null, processoId: data.processo_id ?? null, responsavelId: data.responsavel_id ?? null },
  });

  return { eventoId: evento.id };
}

export async function excluirEvento(eventoId: string): Promise<{ error: string } | { success: true }> {
  const access = await requireModuleAccess("agenda", "delete");
  if (!access.ok) return { error: access.error };
  if (!z.string().uuid().safeParse(eventoId).success) return { error: "Identificador do evento inválido." };

  const { data: evento, error } = await access.supabase
    .from("eventos")
    .delete()
    .eq("id", eventoId)
    .eq("escritorio_id", access.escritorioId)
    .select("id")
    .maybeSingle();
  if (error || !evento) return { error: "Não foi possível excluir este evento." };

  await logAudit({
    escritorioId: access.escritorioId,
    usuarioId: access.user.id,
    tabela: "eventos",
    registroId: evento.id,
    acao: "delete",
  });
  return { success: true };
}
