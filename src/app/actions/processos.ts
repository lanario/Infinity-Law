"use server";

import { requireModuleAccess } from "@/lib/server/module-access";
import { runWithRequiredAccess } from "@/lib/server/required-access";
import { processoSchema } from "@/lib/validations/processo.schema";

export async function salvarProcesso(
  input: unknown
): Promise<{ error: string } | { processoId: string }> {
  return runWithRequiredAccess(
    () => requireModuleAccess("processos", "write"),
    (error) => ({ error }),
    async ({ supabase, escritorioId }) => {
      const parsed = processoSchema.safeParse(input);
      if (!parsed.success) {
        return {
          error: parsed.error.issues[0]?.message ?? "Revise os dados do processo.",
        };
      }

      const data = parsed.data;
      const clientePrincipal = data.clientes[0];
      if (!clientePrincipal) return { error: "Selecione ao menos uma parte para o processo." };

      const { data: clientesDisponiveis, error: clienteError } = await supabase
        .from("clientes")
        .select("id")
        .in("id", data.clientes.map((cliente) => cliente.cliente_id))
        .eq("escritorio_id", escritorioId)
        .eq("ativo", true);

      if (clienteError || clientesDisponiveis?.length !== data.clientes.length) {
        return { error: "Uma das partes selecionadas não está disponível neste escritório." };
      }

      if (data.advogado_id) {
        const { data: responsavel, error: responsavelError } = await supabase
          .from("usuarios")
          .select("id")
          .eq("id", data.advogado_id)
          .eq("escritorio_id", escritorioId)
          .eq("ativo", true)
          .maybeSingle();

        if (responsavelError || !responsavel) {
          return { error: "O responsável selecionado não está disponível neste escritório." };
        }
      }

      // Campos novos só entram no INSERT quando preenchidos: sem dados novos o cadastro continua
      // funcionando mesmo antes da migration 20261027120000 ser aplicada.
      const camposJuridicos = Object.fromEntries(
        Object.entries({
          assunto: data.assunto,
          assunto_codigo: data.assunto_codigo,
          classe_codigo: data.classe_codigo,
          grau: data.grau,
          sistema: data.sistema,
          nivel_sigilo: data.nivel_sigilo || undefined,
          datajud_atualizado_em: data.datajud_atualizado_em,
          codigo_municipio_ibge: data.codigo_municipio_ibge,
          parte_contraria: data.parte_contraria,
          advogado_parte_contraria: data.advogado_parte_contraria,
        }).filter(([, value]) => value != null && value !== ""),
      );

      const inserirProcesso = (extra: Record<string, unknown>) => supabase
        .from("processos")
        .insert({
          escritorio_id: escritorioId,
          numero_cnj: data.numero_cnj || null,
          numero_cnj_raw: data.numero_cnj_raw || null,
          area_direito_id: data.area_direito_id ?? null,
          grupo_acao: data.grupo_acao,
          tipo_acao: data.tipo_acao,
          classe_processual: data.classe_processual ?? null,
          fase: data.fase,
          etapa: data.etapa,
          status: data.status,
          tribunal: data.tribunal ?? null,
          vara: data.vara ?? null,
          comarca: data.comarca ?? null,
          uf: data.uf ?? null,
          valor_causa: data.valor_causa ?? null,
          data_distribuicao: data.data_distribuicao ?? null,
          data_requerimento: data.data_requerimento || null,
          numero_protocolo: data.numero_protocolo || null,
          processo_originario: data.processo_originario || null,
          pasta_caso: data.pasta_caso || null,
          advogado_id: data.advogado_id ?? null,
          observacoes: data.observacoes || null,
          ...extra,
          ultima_sync_cnj: data.consulta_cnj && data.numero_cnj ? new Date().toISOString() : null,
        })
        .select("id")
        .single();

      let { data: processo, error: processoError } = await inserirProcesso(camposJuridicos);
      // shortcut: coluna inexistente (42703/PGRST204) = migration ainda não aplicada; grava sem os campos novos. Remover após aplicar a migration.
      if (processoError && Object.keys(camposJuridicos).length > 0 && (processoError.code === "42703" || processoError.code === "PGRST204")) {
        console.warn("[salvarProcesso] Migration 20261027120000 pendente; campos jurídicos novos não foram gravados.");
        ({ data: processo, error: processoError } = await inserirProcesso({}));
      }

      if (processoError || !processo) {
        console.error("[salvarProcesso] Falha ao criar processo:", processoError);
        return { error: "Não foi possível salvar o processo. Confira os dados e tente novamente." };
      }

      const processoId = processo.id;

      async function rollbackProcesso() {
        const { error } = await supabase.from("processos").delete().eq("id", processoId);
        if (error) console.error("[salvarProcesso] Não foi possível desfazer o cadastro parcial:", error);
      }

      const { error: clienteVinculoError } = await supabase
        .from("processo_clientes")
        .insert(data.clientes.map((cliente) => ({
          processo_id: processo.id,
          cliente_id: cliente.cliente_id,
          papel: cliente.papel,
        })));

      if (clienteVinculoError) {
        await rollbackProcesso();
        console.error("[salvarProcesso] Falha ao vincular cliente:", clienteVinculoError);
        return { error: "Não foi possível vincular o cliente ao processo." };
      }

      const temHonorarios =
        data.valor_honorarios != null ||
        data.percentual_honorarios != null ||
        (data.contingenciamento != null && data.contingenciamento !== "nao");

      if (temHonorarios) {
        const temValorFixo = data.valor_honorarios != null;
        const temPercentual = data.percentual_honorarios != null;
        const tipoHonorario =
          temValorFixo && temPercentual
            ? "misto"
            : temPercentual || data.contingenciamento !== "nao"
              ? "exito"
              : "fixo";

        const { error: honorarioError } = await supabase.from("honorarios").insert({
          escritorio_id: escritorioId,
          processo_id: processo.id,
          cliente_id: clientePrincipal.cliente_id,
          tipo: tipoHonorario,
          valor_fixo: data.valor_honorarios ?? null,
          percentual_exito: data.percentual_honorarios ?? null,
          contingenciamento: data.contingenciamento ?? "nao",
        });

        if (honorarioError) {
          await rollbackProcesso();
          console.error("[salvarProcesso] Falha ao salvar honorários:", honorarioError);
          return { error: "Não foi possível salvar os honorários do processo." };
        }
      }

      if (data.movimentacoes && data.movimentacoes.length > 0) {
        const { error: movimentacoesError } = await supabase
          .from("processo_movimentacoes")
          .insert(
            data.movimentacoes.map((movement) => ({
              processo_id: processo.id,
              escritorio_id: escritorioId,
              data_movimento: movement.data.split("T")[0] ?? movement.data,
              descricao: movement.descricao,
              codigo_cnj: movement.codigo ?? null,
              fonte: "datajud",
            }))
          );

        if (movimentacoesError) {
          await rollbackProcesso();
          console.error("[salvarProcesso] Falha ao salvar movimentações:", movimentacoesError);
          return { error: "O processo foi encontrado, mas as movimentações não puderam ser salvas." };
        }
      }

      return { processoId };
    }
  );
}
