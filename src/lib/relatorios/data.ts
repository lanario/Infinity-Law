import type { RelatorioTipo } from "./types";

export type ReportData = { titulo: string; cabecalhos: string[]; linhas: Array<Array<string | number>>; resumo: string };

type QueryResult = { data: unknown; error: { message?: string } | null };
interface QueryBuilder extends PromiseLike<QueryResult> {
  select(columns: string): QueryBuilder;
  gte(column: string, value: string): QueryBuilder;
  lte(column: string, value: string): QueryBuilder;
  lt(column: string, value: string): QueryBuilder;
  order(column: string): QueryBuilder;
  limit(count: number): QueryBuilder;
  in(column: string, values: Array<string | number>): QueryBuilder;
}
type ReportClient = { from(table: string): QueryBuilder };

type NameRelation = { nome: string } | Array<{ nome: string }> | null;
type Parcela = {
  valor: number | string;
  status: string;
  vencimento: string;
  data_pagamento: string | null;
  honorarios: { tipo: string; clientes: NameRelation } | Array<{ tipo: string; clientes: NameRelation }> | null;
};
type Processo = {
  area_direito_id: number | null;
  advogado_id: string | null;
  status: string;
  created_at: string;
  areas_direito?: NameRelation;
  usuarios?: NameRelation;
};

// Limite de linhas por relatório. Acima disso o resumo avisa que o resultado foi truncado.
// (O PostgREST do Supabase pode aplicar um max_rows menor; o comportamento anterior já era limitado por ele.)
const REPORT_ROW_LIMIT = 5000;
const first = <T>(value: T | T[] | null | undefined): T | null => (Array.isArray(value) ? value[0] ?? null : value ?? null);
const truncatedNote = (count: number) => (count >= REPORT_ROW_LIMIT ? ` · limite de ${REPORT_ROW_LIMIT} registros atingido; reduza o período` : "");

async function rows<T>(query: QueryBuilder): Promise<T[]> {
  const result = await query;
  if (result.error) throw new Error(result.error.message ?? "Falha ao consultar os dados do relatório.");
  return (result.data ?? []) as T[];
}

function inRange(query: QueryBuilder, inicio: string, fim: string) {
  const exclusiveEnd = new Date(`${fim}T00:00:00.000Z`);
  exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
  return query.gte("created_at", `${inicio}T00:00:00.000Z`).lt("created_at", exclusiveEnd.toISOString());
}

export async function buildReport(client: unknown, tipo: RelatorioTipo, inicio: string, fim: string): Promise<ReportData> {
  const supabase = client as ReportClient;
  if (tipo === "faturamento") {
    // Embed (mesmo padrão de financeiro/page.tsx) no lugar de 3 consultas encadeadas com .in(ids).
    const parcelas = await rows<Parcela>(supabase.from("parcelas").select("valor, status, vencimento, data_pagamento, honorarios!parcelas_honorario_id_fkey(tipo, clientes!honorarios_cliente_id_fkey(nome))").gte("vencimento", inicio).lte("vencimento", fim).order("vencimento").limit(REPORT_ROW_LIMIT));
    const linhas: Array<Array<string | number>> = parcelas.map((parcela) => {
      const honorario = first(parcela.honorarios);
      return [first(honorario?.clientes)?.nome ?? "—", honorario?.tipo ?? "—", parcela.vencimento, Number(parcela.valor), parcela.status, parcela.data_pagamento ?? "—"];
    });
    const total = linhas.reduce<number>((sum, row) => sum + Number(row[3]), 0);
    return { titulo: "Faturamento por período", cabecalhos: ["Cliente", "Honorário", "Vencimento", "Valor (R$)", "Status", "Pagamento"], linhas, resumo: `${linhas.length} parcelas · ${total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} no período${truncatedNote(parcelas.length)}` };
  }

  const embed = tipo === "processos" ? ", areas_direito(nome)" : ", usuarios!advogado_id(nome)";
  const processos = await rows<Processo>(inRange(supabase.from("processos").select(`area_direito_id, advogado_id, status, created_at${embed}`), inicio, fim).limit(REPORT_ROW_LIMIT));

  if (tipo === "processos") {
    const counts = new Map<string, number>();
    for (const processo of processos) {
      const area = first(processo.areas_direito)?.nome ?? "Sem área definida";
      counts.set(area, (counts.get(area) ?? 0) + 1);
    }
    const linhas: Array<Array<string | number>> = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([area, count]) => [area, count]);
    return { titulo: "Processos por área", cabecalhos: ["Área do direito", "Quantidade de processos"], linhas, resumo: `${processos.length} processos cadastrados no período${truncatedNote(processos.length)}` };
  }

  const grupos = new Map<string, { total: number; ativos: number; encerrados: number }>();
  for (const processo of processos) {
    const responsavel = first(processo.usuarios)?.nome ?? "Sem responsável";
    const atual = grupos.get(responsavel) ?? { total: 0, ativos: 0, encerrados: 0 };
    atual.total += 1;
    if (processo.status === "ativo") atual.ativos += 1;
    if (processo.status === "encerrado") atual.encerrados += 1;
    grupos.set(responsavel, atual);
  }
  const linhas: Array<Array<string | number>> = [...grupos.entries()].sort((a, b) => b[1].total - a[1].total).map(([nome, values]) => [nome, values.total, values.ativos, values.encerrados]);
  return { titulo: "Processos por responsável", cabecalhos: ["Responsável", "Total", "Ativos", "Encerrados"], linhas, resumo: `${processos.length} processos cadastrados no período${truncatedNote(processos.length)}` };
}
