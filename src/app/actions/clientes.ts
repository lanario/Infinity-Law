"use server";

import { logAudit } from "@/lib/audit";
import { requireModuleAccess } from "@/lib/server/module-access";
import { clienteSchema } from "@/lib/validations/cliente.schema";
import { z } from "zod";

type SalvarClienteResult = { error: string } | { clienteId: string };

export async function salvarCliente(input: unknown, clienteId?: string): Promise<SalvarClienteResult> {
  const access = await requireModuleAccess("clientes", "write");
  if (!access.ok) return { error: access.error };

  const parsedId = clienteId ? z.string().uuid().safeParse(clienteId) : null;
  if (parsedId && !parsedId.success) return { error: "Identificador de cliente inválido." };

  const parsed = clienteSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revise os dados do cliente." };
  }
  if (!clienteId && !parsed.data.cep) {
    return { error: "Informe o CEP para cadastrar o cliente." };
  }

  const data = parsed.data;
  const payload = {
    tipo: data.tipo,
    nome: data.nome.trim(),
    cpf_cnpj: data.cpf_cnpj || null,
    email: data.email?.trim() || null,
    telefone: data.telefone || null,
    cep: data.cep || null,
    logradouro: data.logradouro?.trim() || null,
    numero: data.numero?.trim() || null,
    complemento: data.complemento?.trim() || null,
    bairro: data.bairro?.trim() || null,
    cidade: data.cidade?.trim() || null,
    estado: data.estado?.trim().toUpperCase() || null,
    observacoes: data.observacoes?.trim() || null,
    ativo: data.ativo,
  };

  const query = clienteId
    ? access.supabase
        .from("clientes")
        .update(payload)
        .eq("id", clienteId)
        .eq("escritorio_id", access.escritorioId)
        .select("id")
        .maybeSingle()
    : access.supabase
        .from("clientes")
        .insert({ ...payload, escritorio_id: access.escritorioId })
        .select("id")
        .single();

  const { data: cliente, error } = await query;
  if (error || !cliente) {
    console.error("[salvarCliente] Falha ao salvar cliente:", error);
    return { error: "Não foi possível salvar o cliente. Verifique os dados e tente novamente." };
  }

  await logAudit({
    escritorioId: access.escritorioId,
    usuarioId: access.user.id,
    tabela: "clientes",
    registroId: cliente.id,
    acao: clienteId ? "update" : "insert",
    dadosNovos: { tipo: data.tipo, ativo: data.ativo },
  });

  return { clienteId: cliente.id };
}
