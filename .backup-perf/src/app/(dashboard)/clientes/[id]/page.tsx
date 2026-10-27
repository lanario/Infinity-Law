import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ClienteProntuario, type ProntuarioTab } from "@/components/clientes/cliente-prontuario";
import type { ClienteDocumento } from "@/components/clientes/cliente-documentos";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { createClient } from "@/lib/supabase/server";
import { failedQueryOperations, logQueryFailures } from "@/lib/server/query-error-state.mjs";

export const metadata: Metadata = { title: "Prontuário do Cliente" };

const PRONTUARIO_TABS: ProntuarioTab[] = ["resumo", "cadastro", "processos", "intimacoes", "documentos", "financeiro", "agenda", "historico"];

interface PageProps {
  params: { id: string };
  searchParams?: { aba?: string };
}

export default async function ClienteDetalhePage({ params, searchParams }: PageProps) {
  const supabase = createClient();
  const [clientRead, clientWrite, processRead, financeRead, agendaRead, communicationRead] = await Promise.all([
    supabase.rpc("has_permission", { modulo: "clientes", acao: "read" }),
    supabase.rpc("has_permission", { modulo: "clientes", acao: "write" }),
    supabase.rpc("has_permission", { modulo: "processos", acao: "read" }),
    supabase.rpc("has_permission", { modulo: "financeiro", acao: "read" }),
    supabase.rpc("has_permission", { modulo: "agenda", acao: "read" }),
    supabase.rpc("has_permission", { modulo: "comunicacao", acao: "read" }),
  ]);
  const permissionResults = [
    { operation: "cliente-ficha-permission", error: clientRead.error },
    { operation: "cliente-edit-permission", error: clientWrite.error },
    { operation: "cliente-process-permission", error: processRead.error },
    { operation: "cliente-finance-permission", error: financeRead.error },
    { operation: "cliente-agenda-permission", error: agendaRead.error },
    { operation: "cliente-communication-permission", error: communicationRead.error },
  ];
  if (failedQueryOperations(permissionResults).length > 0) {
    logQueryFailures("ClienteDetalhePage", permissionResults);
    return <div className="p-4 sm:p-6"><QueryErrorState retryHref={`/clientes/${params.id}`} /></div>;
  }
  if (!clientRead.data) redirect("/dashboard");

  const [{ data: cliente, error: clienteError }, { data: escritorioId, error: officeError }] = await Promise.all([
    supabase.from("clientes").select("*").eq("id", params.id).maybeSingle(),
    supabase.rpc("my_escritorio_id"),
  ]);
  if (clienteError || !cliente || officeError || !escritorioId) notFound();

  const canReadProcessos = Boolean(processRead.data);
  const canReadFinanceiro = Boolean(financeRead.data);
  const canReadAgenda = Boolean(agendaRead.data);
  const canReadComunicacao = Boolean(communicationRead.data);

  const linksResult = canReadProcessos
    ? await supabase
        .from("processo_clientes")
        .select(`
          papel,
          processos!inner (
            id, numero_cnj, numero_protocolo, pasta_caso, processo_originario,
            classe_processual, grupo_acao, tipo_acao, status, fase, etapa,
            tribunal, vara, comarca, uf, valor_causa, data_distribuicao,
            data_requerimento, observacoes, area_direito_id, advogado_id,
            areas_direito ( nome ),
            usuarios!advogado_id ( nome )
          )
        `)
        .eq("cliente_id", params.id)
        .limit(100)
    : null;

  if (linksResult?.error) {
    logQueryFailures("ClienteDetalhePage", [{ operation: "cliente-process-links", error: linksResult.error }]);
  }
  let hasPartialData = Boolean(linksResult?.error);

  const processLinks = linksResult?.data ?? [];
  const processos = processLinks.flatMap((link) => {
    const joinedProcess = Array.isArray(link.processos) ? link.processos[0] : link.processos;
    if (!joinedProcess) return [];

    const area = Array.isArray(joinedProcess.areas_direito)
      ? joinedProcess.areas_direito[0]?.nome
      : joinedProcess.areas_direito?.nome;
    const advogado = Array.isArray(joinedProcess.usuarios)
      ? joinedProcess.usuarios[0]?.nome
      : joinedProcess.usuarios?.nome;

    return [{
      id: joinedProcess.id,
      numero_cnj: joinedProcess.numero_cnj,
      numero_protocolo: joinedProcess.numero_protocolo,
      pasta_caso: joinedProcess.pasta_caso,
      processo_originario: joinedProcess.processo_originario,
      classe_processual: joinedProcess.classe_processual,
      grupo_acao: joinedProcess.grupo_acao,
      tipo_acao: joinedProcess.tipo_acao,
      status: joinedProcess.status,
      fase: joinedProcess.fase,
      etapa: joinedProcess.etapa,
      tribunal: joinedProcess.tribunal,
      vara: joinedProcess.vara,
      comarca: joinedProcess.comarca,
      uf: joinedProcess.uf,
      valor_causa: joinedProcess.valor_causa,
      data_distribuicao: joinedProcess.data_distribuicao,
      data_requerimento: joinedProcess.data_requerimento,
      observacoes: joinedProcess.observacoes,
      area: area ?? null,
      advogado: advogado ?? null,
      papel: link.papel,
      movimentacoes: [] as Array<{ id: string; data_movimento: string; descricao: string; codigo_cnj: string | null; fonte: string }>,
    }];
  });

  const processIds = processos.map((processo) => processo.id);
  const [movementsResult, honorariosResult, lancamentosResult, eventsByClientResult, eventsByProcessResult, communicationsByClientResult, communicationsByProcessResult, publicationsResult, documentListResult] = await Promise.all([
    canReadProcessos && processIds.length
      ? supabase.from("processo_movimentacoes").select("id, processo_id, data_movimento, descricao, codigo_cnj, fonte").in("processo_id", processIds).order("data_movimento", { ascending: false }).limit(300)
      : Promise.resolve({ data: [], error: null }),
    canReadFinanceiro
      ? supabase.from("honorarios").select("id, tipo, status, descricao, valor_fixo, percentual_exito, base_calculo_exito, processo_id, created_at").eq("cliente_id", params.id).order("created_at", { ascending: false }).limit(100)
      : Promise.resolve({ data: [], error: null }),
    canReadFinanceiro
      ? supabase.from("lancamentos_financeiros").select("id, tipo, categoria, descricao, valor, vencimento, status, data_pagamento").eq("cliente_id", params.id).order("vencimento", { ascending: false }).limit(100)
      : Promise.resolve({ data: [], error: null }),
    canReadAgenda
      ? supabase.from("eventos").select("id, titulo, tipo, inicio, fim, dia_inteiro, processo_id, descricao, local, link_videoconf").eq("cliente_id", params.id).order("inicio", { ascending: false }).limit(100)
      : Promise.resolve({ data: [], error: null }),
    canReadAgenda && processIds.length
      ? supabase.from("eventos").select("id, titulo, tipo, inicio, fim, dia_inteiro, processo_id, descricao, local, link_videoconf").in("processo_id", processIds).order("inicio", { ascending: false }).limit(100)
      : Promise.resolve({ data: [], error: null }),
    canReadComunicacao
      ? supabase.from("comunicacoes_log").select("id, canal, destinatario, enviado_em, mensagem, status, processo_id").eq("cliente_id", params.id).order("enviado_em", { ascending: false }).limit(100)
      : Promise.resolve({ data: [], error: null }),
    canReadComunicacao && processIds.length
      ? supabase.from("comunicacoes_log").select("id, canal, destinatario, enviado_em, mensagem, status, processo_id").in("processo_id", processIds).order("enviado_em", { ascending: false }).limit(100)
      : Promise.resolve({ data: [], error: null }),
    canReadComunicacao && canReadProcessos && processIds.length
      ? supabase.from("djen_publicacoes").select("id, processo_id, numero_processo, numero_processo_com_mascara, data_disponibilizacao, tribunal, tipo_comunicacao, orgao, texto, link, nome_classe, comunicacao_ativa, created_at").in("processo_id", processIds).order("data_disponibilizacao", { ascending: false, nullsFirst: false }).limit(100)
      : Promise.resolve({ data: [], error: null }),
    supabase.storage.from("cliente-documentos").list(`${escritorioId}/${params.id}`, {
      limit: 100,
      sortBy: { column: "created_at", order: "desc" },
    }),
  ]);

  const moduleQueryResults = [
    { operation: "cliente-process-movements", error: movementsResult.error },
    { operation: "cliente-honorarios", error: honorariosResult.error },
    { operation: "cliente-finance-transactions", error: lancamentosResult.error },
    { operation: "cliente-events", error: eventsByClientResult.error },
    { operation: "process-events", error: eventsByProcessResult.error },
    { operation: "cliente-communications", error: communicationsByClientResult.error },
    { operation: "process-communications", error: communicationsByProcessResult.error },
    { operation: "cliente-process-publications", error: publicationsResult.error },
  ];
  if (failedQueryOperations(moduleQueryResults).length > 0) {
    hasPartialData = true;
    logQueryFailures("ClienteDetalhePage", moduleQueryResults);
  }

  const movementRows = movementsResult.data ?? [];
  const processosComMovimentacoes = processos.map((processo) => ({
    ...processo,
    movimentacoes: movementRows.filter((movimentacao) => movimentacao.processo_id === processo.id),
  }));

  const honorariosRows = honorariosResult.data ?? [];
  const honorarioIds = honorariosRows.map((honorario) => honorario.id);
  const parcelasResult = canReadFinanceiro && honorarioIds.length
    ? await supabase.from("parcelas").select("id, honorario_id, numero_parcela, valor, vencimento, status, data_pagamento, forma_pagamento, observacoes").in("honorario_id", honorarioIds).order("vencimento", { ascending: true }).limit(500)
    : { data: [], error: null };
  if (parcelasResult.error) {
    hasPartialData = true;
    logQueryFailures("ClienteDetalhePage", [{ operation: "cliente-honorario-installments", error: parcelasResult.error }]);
  }

  const parcelas = parcelasResult.data ?? [];
  const honorarios = honorariosRows.map((honorario) => ({
    ...honorario,
    parcelas: parcelas.filter((parcela) => parcela.honorario_id === honorario.id),
  }));

  const eventos = [...(eventsByClientResult.data ?? []), ...(eventsByProcessResult.data ?? [])]
    .filter((evento, index, all) => all.findIndex((item) => item.id === evento.id) === index)
    .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
  const comunicacoes = [...(communicationsByClientResult.data ?? []), ...(communicationsByProcessResult.data ?? [])]
    .filter((comunicacao, index, all) => all.findIndex((item) => item.id === comunicacao.id) === index)
    .sort((a, b) => new Date(b.enviado_em).getTime() - new Date(a.enviado_em).getTime());
  const publicacoes = publicationsResult.data ?? [];

  const documentosError = documentListResult.error
    ? "Não foi possível acessar os documentos. Confirme se a migração de documentos foi aplicada e tente novamente."
    : null;
  if (documentListResult.error) {
    hasPartialData = true;
    console.error("[ClienteDetalhePage] Falha ao listar documentos do cliente:", documentListResult.error);
  }

  const documentos: ClienteDocumento[] = (documentListResult.data ?? [])
    .filter((file) => Boolean(file.id) && file.name.includes("__"))
    .map((file) => {
      const nameSeparator = file.name.indexOf("__");
      const metadata = file.metadata as { size?: number | string; mimetype?: string } | null;
      return {
        id: file.id!,
        name: file.name.slice(nameSeparator + 2),
        path: `${escritorioId}/${params.id}/${file.name}`,
        size: Number(metadata?.size ?? 0),
        mimeType: metadata?.mimetype ?? "application/octet-stream",
        createdAt: file.created_at,
      };
    });

  const requestedTab = searchParams?.aba;
  const initialTab = PRONTUARIO_TABS.includes(requestedTab as ProntuarioTab) ? requestedTab as ProntuarioTab : "resumo";

  return (
    <ClienteProntuario
      key={cliente.id}
      cliente={cliente}
      escritorioId={escritorioId}
      initialTab={initialTab}
      canEdit={Boolean(clientWrite.data)}
      canReadProcessos={canReadProcessos}
      canReadFinanceiro={canReadFinanceiro}
      canReadAgenda={canReadAgenda}
      canReadComunicacao={canReadComunicacao}
      processos={processosComMovimentacoes}
      honorarios={honorarios}
      lancamentos={lancamentosResult.data ?? []}
      eventos={eventos}
      comunicacoes={comunicacoes}
      publicacoes={publicacoes}
      documentos={documentos}
      documentosError={documentosError}
      hasPartialData={hasPartialData}
    />
  );
}
