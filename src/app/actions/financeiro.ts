"use server";

import { logAudit } from "@/lib/audit";
import { requireModuleAccess } from "@/lib/server/module-access";
import { honorarioSchema } from "@/lib/validations/honorario.schema";
import { lancamentoFinanceiroSchema } from "@/lib/validations/lancamento-financeiro.schema";
import { z } from "zod";

function dataAtualSaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

type SalvarLancamentoFinanceiroResult = { error: string } | { lancamentoId: string };

export async function salvarLancamentoFinanceiro(input: unknown): Promise<SalvarLancamentoFinanceiroResult> {
  const access = await requireModuleAccess("financeiro", "write");
  if (!access.ok) return { error: access.error };

  const parsed = lancamentoFinanceiroSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revise os dados do lançamento." };

  const data = parsed.data;
  if (data.cliente_id) {
    const { data: cliente, error: clienteError } = await access.supabase
      .from("clientes")
      .select("id")
      .eq("id", data.cliente_id)
      .eq("escritorio_id", access.escritorioId)
      .maybeSingle();
    if (clienteError || !cliente) return { error: "O cliente selecionado não está disponível neste escritório." };
  }

  const { data: lancamento, error } = await access.supabase
    .from("lancamentos_financeiros")
    .insert({
      escritorio_id: access.escritorioId,
      tipo: data.tipo,
      descricao: data.descricao,
      categoria: data.categoria,
      valor: data.valor,
      vencimento: data.vencimento,
      status: data.status,
      data_pagamento: data.status === "pago" ? dataAtualSaoPaulo() : null,
      cliente_id: data.cliente_id,
    })
    .select("id")
    .single();

  if (error || !lancamento) {
    console.error("[salvarLancamentoFinanceiro] Falha ao criar lançamento:", error);
    return { error: "Não foi possível salvar o lançamento financeiro." };
  }

  await logAudit({
    escritorioId: access.escritorioId,
    usuarioId: access.user.id,
    tabela: "lancamentos_financeiros",
    registroId: lancamento.id,
    acao: "insert",
    dadosNovos: { tipo: data.tipo, categoria: data.categoria, valor: data.valor, clienteId: data.cliente_id },
  });

  return { lancamentoId: lancamento.id };
}

type AtualizarDespesaFinanceiraResult = { error: string } | { success: true };

export async function atualizarDespesaFinanceira(
  lancamentoId: string,
  input: unknown,
): Promise<AtualizarDespesaFinanceiraResult> {
  const access = await requireModuleAccess("financeiro", "write");
  if (!access.ok) return { error: access.error };

  const parsedId = z.string().uuid().safeParse(lancamentoId);
  if (!parsedId.success) return { error: "Identificador de despesa inválido." };

  const parsed = lancamentoFinanceiroSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revise os dados da despesa." };
  if (parsed.data.tipo !== "despesa") return { error: "Somente despesas podem ser editadas por esta ação." };

  const data = parsed.data;
  if (data.cliente_id) {
    const { data: cliente, error: clienteError } = await access.supabase
      .from("clientes")
      .select("id")
      .eq("id", data.cliente_id)
      .eq("escritorio_id", access.escritorioId)
      .maybeSingle();
    if (clienteError || !cliente) return { error: "O cliente selecionado não está disponível neste escritório." };
  }

  const { data: atual, error: consultaError } = await access.supabase
    .from("lancamentos_financeiros")
    .select("id, tipo, descricao, categoria, valor, vencimento, status, data_pagamento, cliente_id")
    .eq("id", parsedId.data)
    .eq("escritorio_id", access.escritorioId)
    .eq("tipo", "despesa")
    .maybeSingle();

  if (consultaError || !atual) return { error: "Esta despesa não está disponível para edição." };

  const dataPagamento = data.status === "pago" ? atual.data_pagamento ?? dataAtualSaoPaulo() : null;
  const { data: lancamento, error } = await access.supabase
    .from("lancamentos_financeiros")
    .update({
      descricao: data.descricao,
      categoria: data.categoria,
      valor: data.valor,
      vencimento: data.vencimento,
      status: data.status,
      data_pagamento: dataPagamento,
      cliente_id: data.cliente_id,
    })
    .eq("id", parsedId.data)
    .eq("escritorio_id", access.escritorioId)
    .eq("tipo", "despesa")
    .select("id")
    .maybeSingle();

  if (error || !lancamento) {
    console.error("[atualizarDespesaFinanceira] Falha ao atualizar despesa:", error);
    return { error: "Não foi possível atualizar esta despesa." };
  }

  await logAudit({
    escritorioId: access.escritorioId,
    usuarioId: access.user.id,
    tabela: "lancamentos_financeiros",
    registroId: lancamento.id,
    acao: "update",
    dadosAnteriores: {
      descricao: atual.descricao,
      categoria: atual.categoria,
      valor: atual.valor,
      vencimento: atual.vencimento,
      status: atual.status,
      data_pagamento: atual.data_pagamento,
      cliente_id: atual.cliente_id,
    },
    dadosNovos: {
      descricao: data.descricao,
      categoria: data.categoria,
      valor: data.valor,
      vencimento: data.vencimento,
      status: data.status,
      data_pagamento: dataPagamento,
      cliente_id: data.cliente_id,
    },
  });

  return { success: true };
}

type MarcarLancamentoFinanceiroPagoResult = { error: string } | { success: true };

export async function marcarLancamentoFinanceiroPago(lancamentoId: string): Promise<MarcarLancamentoFinanceiroPagoResult> {
  const access = await requireModuleAccess("financeiro", "write");
  if (!access.ok) return { error: access.error };

  const parsedId = z.string().uuid().safeParse(lancamentoId);
  if (!parsedId.success) return { error: "Identificador de lançamento inválido." };

  const dataPagamento = dataAtualSaoPaulo();
  const { data: lancamento, error } = await access.supabase
    .from("lancamentos_financeiros")
    .update({ status: "pago", data_pagamento: dataPagamento })
    .eq("id", parsedId.data)
    .eq("escritorio_id", access.escritorioId)
    .in("status", ["pendente", "vencido"])
    .select("id, tipo, valor")
    .maybeSingle();

  if (error || !lancamento) return { error: "Não foi possível registrar o pagamento deste lançamento." };

  await logAudit({
    escritorioId: access.escritorioId,
    usuarioId: access.user.id,
    tabela: "lancamentos_financeiros",
    registroId: lancamento.id,
    acao: "update",
    dadosNovos: { status: "pago", data_pagamento: dataPagamento, tipo: lancamento.tipo, valor: lancamento.valor },
  });

  return { success: true };
}

type SalvarHonorarioResult = { error: string } | { honorarioId: string };

export async function salvarHonorario(input: unknown): Promise<SalvarHonorarioResult> {
  const access = await requireModuleAccess("financeiro", "write");
  if (!access.ok) return { error: access.error };

  const parsed = honorarioSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revise os dados do honorário." };
  }

  const data = parsed.data;
  const { data: cliente, error: clienteError } = await access.supabase
    .from("clientes")
    .select("id")
    .eq("id", data.cliente_id)
    .eq("escritorio_id", access.escritorioId)
    .eq("ativo", true)
    .maybeSingle();

  if (clienteError || !cliente) return { error: "Selecione um cliente ativo deste escritório." };

  if (data.processo_id) {
    const { data: processo, error: processoError } = await access.supabase
      .from("processos")
      .select("id")
      .eq("id", data.processo_id)
      .eq("escritorio_id", access.escritorioId)
      .maybeSingle();
    if (processoError || !processo) return { error: "O processo selecionado não está disponível neste escritório." };
  }

  const { data: honorario, error: insertError } = await access.supabase
    .from("honorarios")
    .insert({
      escritorio_id: access.escritorioId,
      cliente_id: data.cliente_id,
      processo_id: data.processo_id || null,
      tipo: data.tipo,
      descricao: data.descricao?.trim() || null,
      valor_fixo: data.valor_fixo ?? null,
      percentual_exito: data.percentual_exito ?? null,
      base_calculo_exito: data.base_calculo_exito?.trim() || null,
      status: "ativo",
    })
    .select("id")
    .single();

  if (insertError || !honorario) {
    console.error("[salvarHonorario] Falha ao criar honorário:", insertError);
    return { error: "Não foi possível salvar o contrato de honorários." };
  }

  const temParcelas = (data.tipo === "fixo" || data.tipo === "misto") && data.valor_fixo != null;
  if (temParcelas) {
    const { error: parcelasError } = await access.supabase.rpc("criar_parcelas", {
      p_honorario_id: honorario.id,
      p_escritorio_id: access.escritorioId,
      p_valor_total: data.valor_fixo!,
      p_n_parcelas: data.n_parcelas,
      p_data_primeira: data.data_primeira_parcela,
    });

    if (parcelasError) {
      const { error: rollbackError } = await access.supabase
        .from("honorarios")
        .delete()
        .eq("id", honorario.id)
        .eq("escritorio_id", access.escritorioId);
      if (rollbackError) console.error("[salvarHonorario] Falha ao desfazer honorário parcial:", rollbackError);
      console.error("[salvarHonorario] Falha ao gerar parcelas:", parcelasError);
      return { error: "O contrato foi validado, mas não foi possível gerar as parcelas. Tente novamente." };
    }
  }

  await logAudit({
    escritorioId: access.escritorioId,
    usuarioId: access.user.id,
    tabela: "honorarios",
    registroId: honorario.id,
    acao: "insert",
    dadosNovos: { tipo: data.tipo, clienteId: data.cliente_id, processoId: data.processo_id ?? null },
  });

  return { honorarioId: honorario.id };
}

type MarcarParcelaResult = { error: string } | { success: true };

export async function marcarParcelaPaga(parcelaId: string): Promise<MarcarParcelaResult> {
  const access = await requireModuleAccess("financeiro", "write");
  if (!access.ok) return { error: access.error };

  const parsedId = z.string().uuid().safeParse(parcelaId);
  if (!parsedId.success) return { error: "Identificador de parcela inválido." };

  const dataPagamento = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const { data: parcela, error } = await access.supabase
    .from("parcelas")
    .update({ status: "pago", data_pagamento: dataPagamento })
    .eq("id", parcelaId)
    .eq("escritorio_id", access.escritorioId)
    .in("status", ["pendente", "vencido"])
    .select("id")
    .maybeSingle();

  if (error || !parcela) return { error: "Não foi possível registrar o recebimento desta parcela." };

  await logAudit({
    escritorioId: access.escritorioId,
    usuarioId: access.user.id,
    tabela: "parcelas",
    registroId: parcela.id,
    acao: "update",
    dadosNovos: { status: "pago", data_pagamento: dataPagamento },
  });

  return { success: true };
}
