"use server";

import { requireModuleAccess } from "@/lib/server/module-access";
import { runWithRequiredAccess } from "@/lib/server/required-access";
import { processoDadosPedidoSchema, processoSchema } from "@/lib/validations/processo.schema";
import { z } from "zod";

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
        // DataJud repete movimentos com mesma data+descrição; o índice único idx_movimentacoes_upsert_identity rejeitaria (23505).
        const agora = new Date().toISOString();
        const linhasMovimentacoes = new Map<string, Record<string, unknown>>();
        for (const movement of data.movimentacoes) {
          const data_movimento = movement.data.split("T")[0] ?? movement.data;
          const chave = `${data_movimento}|${movement.descricao}`;
          if (linhasMovimentacoes.has(chave)) continue;
          linhasMovimentacoes.set(chave, {
            processo_id: processo.id,
            escritorio_id: escritorioId,
            data_movimento,
            descricao: movement.descricao,
            codigo_cnj: movement.codigo ?? null,
            fonte: "datajud",
            data_hora: movement.data_hora ?? null,
            complementos: movement.complementos ?? null,
            visto_em: agora, // cadastro inicial: nada é "novo"
          });
        }

        const gravar = (linhas: Record<string, unknown>[]) => supabase
          .from("processo_movimentacoes")
          .upsert(linhas as never, { onConflict: "processo_id,data_movimento,descricao", ignoreDuplicates: true });
        let { error: movimentacoesError } = await gravar([...linhasMovimentacoes.values()]);
        // shortcut: 42703/PGRST204 = migration 20261027180000 pendente; regrava sem colunas novas. Remover após aplicar.
        if (movimentacoesError && (movimentacoesError.code === "42703" || movimentacoesError.code === "PGRST204")) {
          console.warn("[salvarProcesso] Migration 20261027180000 pendente; detalhes das movimentações não gravados.");
          ({ error: movimentacoesError } = await gravar(
            [...linhasMovimentacoes.values()].map(({ data_hora: _h, complementos: _c, visto_em: _v, ...resto }) => resto),
          ));
        }

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

export async function atualizarDadosPedido(
  processoId: string,
  input: unknown,
): Promise<{ error: string } | { processoId: string }> {
  return runWithRequiredAccess(
    () => requireModuleAccess("processos", "write"),
    (error) => ({ error }),
    async ({ supabase, escritorioId }) => {
      if (!z.string().uuid().safeParse(processoId).success) {
        return { error: "Não foi possível identificar o processo." };
      }

      const parsed = processoDadosPedidoSchema.safeParse(input);
      if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Revise os dados do pedido." };
      }

      const data = parsed.data;
      const podeAlterarHonorarios =
        data.valor_honorarios !== undefined ||
        data.percentual_honorarios !== undefined ||
        data.contingenciamento !== undefined;
      const podeAlterarValorCausa = data.valor_causa !== undefined;

      if (podeAlterarValorCausa) {
        const acessoFinanceiro = await requireModuleAccess("financeiro", "read");
        if (!acessoFinanceiro.ok || acessoFinanceiro.escritorioId !== escritorioId) {
          return { error: "Seu perfil não tem permissão para atualizar o valor da causa." };
        }
      }

      if (podeAlterarHonorarios) {
        const acessoFinanceiro = await requireModuleAccess("financeiro", "write");
        if (!acessoFinanceiro.ok || acessoFinanceiro.escritorioId !== escritorioId) {
          return { error: "Seu perfil não tem permissão para atualizar os honorários." };
        }
      }

      const { data: processoAtual, error: processoReadError } = await supabase
        .from("processos")
        .select("id")
        .eq("id", processoId)
        .eq("escritorio_id", escritorioId)
        .maybeSingle();

      if (processoReadError || !processoAtual) {
        return { error: "Este processo não existe ou você não tem acesso a ele." };
      }

      if (data.advogado_id) {
        const { data: advogado, error: advogadoError } = await supabase
          .from("usuarios")
          .select("id")
          .eq("id", data.advogado_id)
          .eq("escritorio_id", escritorioId)
          .maybeSingle();

        if (advogadoError || !advogado) {
          return { error: "O advogado responsável não está disponível neste escritório." };
        }
      }

      const idsClientes = data.clientes.map((cliente) => cliente.cliente_id);
      const { data: clientesDisponiveis, error: clientesError } = await supabase
        .from("clientes")
        .select("id")
        .in("id", idsClientes)
        .eq("escritorio_id", escritorioId);

      if (clientesError || clientesDisponiveis?.length !== idsClientes.length) {
        return { error: "Uma das partes selecionadas não está disponível neste escritório." };
      }

      const { data: vinculosAtuais, error: vinculosReadError } = await supabase
        .from("processo_clientes")
        .select("cliente_id, papel")
        .eq("processo_id", processoId);

      if (vinculosReadError) {
        console.error("[atualizarDadosPedido] Falha ao consultar partes atuais:", vinculosReadError);
        return { error: "Não foi possível carregar as partes atuais do processo." };
      }

      const vinculosAnteriores = (vinculosAtuais ?? []).map((vinculo) => ({
        cliente_id: vinculo.cliente_id,
        papel: vinculo.papel as "autor" | "reu" | "terceiro",
      }));
      const vinculosNovos = data.clientes.map((cliente) => ({
        cliente_id: cliente.cliente_id,
        papel: cliente.papel,
      }));
      const serializarVinculos = (vinculos: typeof vinculosNovos) =>
        vinculos.map(({ cliente_id, papel }) => `${cliente_id}:${papel}`).sort().join("|");
      const precisaAtualizarVinculos =
        serializarVinculos(vinculosAnteriores) !== serializarVinculos(vinculosNovos);

      const { data: honorarioAtual, error: honorarioReadError } = podeAlterarHonorarios
        ? await supabase
            .from("honorarios")
            .select("id, cliente_id, valor_fixo, percentual_exito, contingenciamento")
            .eq("processo_id", processoId)
            .eq("escritorio_id", escritorioId)
            .limit(1)
            .maybeSingle()
        : { data: null, error: null };

      if (honorarioReadError) {
        console.error("[atualizarDadosPedido] Falha ao consultar honorários:", honorarioReadError);
        return { error: "Não foi possível carregar os honorários atuais." };
      }

      const valorFixo = data.valor_honorarios !== undefined
        ? data.valor_honorarios ?? null
        : honorarioAtual?.valor_fixo ?? null;
      const percentualExito = data.percentual_honorarios !== undefined
        ? data.percentual_honorarios ?? null
        : honorarioAtual?.percentual_exito ?? null;
      const contingenciamento = data.contingenciamento !== undefined
        ? data.contingenciamento ?? "nao"
        : honorarioAtual?.contingenciamento ?? "nao";
      const temHonorarios =
        valorFixo !== null || percentualExito !== null || contingenciamento !== "nao";
      const tipoHonorario =
        valorFixo !== null && percentualExito !== null
          ? "misto"
          : percentualExito !== null || contingenciamento !== "nao"
            ? "exito"
            : "fixo";

      async function restaurarVinculos() {
        const { error: limparError } = await supabase
          .from("processo_clientes")
          .delete()
          .eq("processo_id", processoId);
        if (limparError) {
          console.error("[atualizarDadosPedido] Falha ao desfazer os vínculos de clientes:", limparError);
          return;
        }
        if (vinculosAnteriores.length === 0) return;

        const { error: restaurarError } = await supabase
          .from("processo_clientes")
          .insert(vinculosAnteriores.map((vinculo) => ({ processo_id: processoId, ...vinculo })));
        if (restaurarError) {
          console.error("[atualizarDadosPedido] Falha ao restaurar os vínculos de clientes:", restaurarError);
        }
      }

      let honorarioCriadoId: string | null = null;
      let honorarioAtualizado = false;

      async function restaurarHonorarios() {
        if (honorarioCriadoId) {
          const { error } = await supabase
            .from("honorarios")
            .delete()
            .eq("id", honorarioCriadoId)
            .eq("escritorio_id", escritorioId)
            .eq("processo_id", processoId);
          if (error) console.error("[atualizarDadosPedido] Falha ao desfazer novo honorário:", error);
          return;
        }
        if (!honorarioAtual || !honorarioAtualizado) return;

        const { error } = await supabase
          .from("honorarios")
          .update({
            cliente_id: honorarioAtual.cliente_id,
            valor_fixo: honorarioAtual.valor_fixo,
            percentual_exito: honorarioAtual.percentual_exito,
            contingenciamento: honorarioAtual.contingenciamento,
          })
          .eq("id", honorarioAtual.id)
          .eq("escritorio_id", escritorioId)
          .eq("processo_id", processoId);
        if (error) console.error("[atualizarDadosPedido] Falha ao restaurar honorários:", error);
      }

      if (precisaAtualizarVinculos) {
        const { error: apagarVinculosError } = await supabase
          .from("processo_clientes")
          .delete()
          .eq("processo_id", processoId);
        if (apagarVinculosError) {
          console.error("[atualizarDadosPedido] Falha ao atualizar partes:", apagarVinculosError);
          return { error: "Não foi possível atualizar as partes do processo." };
        }

        const { error: inserirVinculosError } = await supabase
          .from("processo_clientes")
          .insert(vinculosNovos.map((vinculo) => ({ processo_id: processoId, ...vinculo })));
        if (inserirVinculosError) {
          console.error("[atualizarDadosPedido] Falha ao vincular as novas partes:", inserirVinculosError);
          await restaurarVinculos();
          return { error: "Não foi possível atualizar as partes do processo." };
        }
      }

      if (podeAlterarHonorarios) {
        if (honorarioAtual) {
          const { error } = await supabase
            .from("honorarios")
            .update({
              cliente_id: vinculosNovos[0]!.cliente_id,
              tipo: tipoHonorario,
              valor_fixo: valorFixo,
              percentual_exito: percentualExito,
              contingenciamento,
            })
            .eq("id", honorarioAtual.id)
            .eq("escritorio_id", escritorioId)
            .eq("processo_id", processoId);

          if (error) {
            console.error("[atualizarDadosPedido] Falha ao atualizar honorários:", error);
            if (precisaAtualizarVinculos) await restaurarVinculos();
            return { error: "Não foi possível atualizar os honorários do processo." };
          }
          honorarioAtualizado = true;
        } else if (temHonorarios) {
          const { data: honorarioCriado, error } = await supabase
            .from("honorarios")
            .insert({
              escritorio_id: escritorioId,
              processo_id: processoId,
              cliente_id: vinculosNovos[0]!.cliente_id,
              tipo: tipoHonorario,
              valor_fixo: valorFixo,
              percentual_exito: percentualExito,
              contingenciamento,
            })
            .select("id")
            .single();

          if (error || !honorarioCriado) {
            console.error("[atualizarDadosPedido] Falha ao registrar honorários:", error);
            if (precisaAtualizarVinculos) await restaurarVinculos();
            return { error: "Não foi possível atualizar os honorários do processo." };
          }
          honorarioCriadoId = honorarioCriado.id;
        }
      }

      const atualizacaoProcesso: Record<string, unknown> = {
        grupo_acao: data.grupo_acao,
        tipo_acao: data.tipo_acao,
        etapa: data.etapa,
      };
      const incluirCampo = (chave: string, valor: unknown) => {
        if (valor !== undefined) atualizacaoProcesso[chave] = valor;
      };

      incluirCampo("advogado_id", data.advogado_id);
      incluirCampo("classe_processual", data.classe_processual);
      incluirCampo("assunto", data.assunto);
      incluirCampo("grau", data.grau);
      incluirCampo("sistema", data.sistema);
      incluirCampo("comarca", data.comarca);
      incluirCampo("parte_contraria", data.parte_contraria);
      incluirCampo("advogado_parte_contraria", data.advogado_parte_contraria);
      incluirCampo("numero_protocolo", data.numero_protocolo);
      incluirCampo("processo_originario", data.processo_originario);
      incluirCampo("pasta_caso", data.pasta_caso);
      incluirCampo("data_requerimento", data.data_requerimento);
      incluirCampo("valor_causa", data.valor_causa);

      const { data: processoAtualizado, error: processoUpdateError } = await supabase
        .from("processos")
        .update(atualizacaoProcesso as never)
        .eq("id", processoId)
        .eq("escritorio_id", escritorioId)
        .select("id")
        .maybeSingle();

      if (processoUpdateError || !processoAtualizado) {
        console.error("[atualizarDadosPedido] Falha ao atualizar processo:", processoUpdateError);
        await restaurarHonorarios();
        if (precisaAtualizarVinculos) await restaurarVinculos();
        return {
          error: processoUpdateError?.code === "42703" || processoUpdateError?.code === "PGRST204"
            ? "Os campos jurídicos ainda não estão disponíveis no banco. Não foi possível salvar as alterações."
            : "Não foi possível atualizar os dados do processo.",
        };
      }

      return { processoId };
    },
  );
}
