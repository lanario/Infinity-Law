import type { RelatorioTipo } from "./types";

export type ReportData = { titulo: string; cabecalhos: string[]; linhas: Array<Array<string | number>>; resumo: string };

type QueryResult = { data: unknown; error: { message?: string } | null };
interface QueryBuilder extends PromiseLike<QueryResult> {
  select(columns: string): QueryBuilder;
  gte(column: string, value: string): QueryBuilder;
  lte(column: string, value: string): QueryBuilder;
  lt(column: string, value: string): QueryBuilder;
  order(column: string): QueryBuilder;
  in(column: string, values: Array<string | number>): QueryBuilder;
}
type ReportClient = { from(table: string): QueryBuilder };

type Parcela = { valor: number | string; status: string; vencimento: string; data_pagamento: string | null; honorario_id: string };
type Honorario = { id: string; tipo: string; cliente_id: string };
type Cliente = { id: string; nome: string };
type Processo = { id: string; area_direito_id: number | null; advogado_id: string | null; status: string; created_at: string };
type Area = { id: number; nome: string };
type Usuario = { id: string; nome: string };

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
    const parcelas = await rows<Parcela>(supabase.from("parcelas").select("valor, status, vencimento, data_pagamento, honorario_id").gte("vencimento", inicio).lte("vencimento", fim).order("vencimento"));
    const honorarioIds = [...new Set(parcelas.map((parcela) => parcela.honorario_id))];
    const honorarios = honorarioIds.length ? await rows<Honorario>(supabase.from("honorarios").select("id, tipo, cliente_id").in("id", honorarioIds)) : [];
    const clienteIds = [...new Set(honorarios.map((honorario) => honorario.cliente_id))];
    const clientes = clienteIds.length ? await rows<Cliente>(supabase.from("clientes").select("id, nome").in("id", clienteIds)) : [];
    const honorariosMap = new Map(honorarios.map((honorario) => [honorario.id, honorario]));
    const clientesMap = new Map(clientes.map((cliente) => [cliente.id, cliente.nome]));
    const linhas: Array<Array<string | number>> = parcelas.map((parcela) => {
      const honorario = honorariosMap.get(parcela.honorario_id);
      return [honorario ? clientesMap.get(honorario.cliente_id) ?? "—" : "—", honorario?.tipo ?? "—", parcela.vencimento, Number(parcela.valor), parcela.status, parcela.data_pagamento ?? "—"];
    });
    const total = linhas.reduce<number>((sum, row) => sum + Number(row[3]), 0);
    return { titulo: "Faturamento por período", cabecalhos: ["Cliente", "Honorário", "Vencimento", "Valor (R$)", "Status", "Pagamento"], linhas, resumo: `${linhas.length} parcelas · ${total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} no período` };
  }

  const processos = await rows<Processo>(inRange(supabase.from("processos").select("id, area_direito_id, advogado_id, status, created_at"), inicio, fim));

  if (tipo === "processos") {
    const areaIds = [...new Set(processos.map((processo) => processo.area_direito_id).filter((id): id is number => id !== null))];
    const areas = areaIds.length ? await rows<Area>(supabase.from("areas_direito").select("id, nome").in("id", areaIds)) : [];
    const areasMap = new Map(areas.map((area) => [area.id, area.nome]));
    const counts = new Map<string, number>();
    for (const processo of processos) {
      const area = processo.area_direito_id === null ? "Sem área definida" : areasMap.get(processo.area_direito_id) ?? "Sem área definida";
      counts.set(area, (counts.get(area) ?? 0) + 1);
    }
    const linhas: Array<Array<string | number>> = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([area, count]) => [area, count]);
    return { titulo: "Processos por área", cabecalhos: ["Área do direito", "Quantidade de processos"], linhas, resumo: `${processos.length} processos cadastrados no período` };
  }

  const advogadoIds = [...new Set(processos.map((processo) => processo.advogado_id).filter((id): id is string => id !== null))];
  const usuarios = advogadoIds.length ? await rows<Usuario>(supabase.from("usuarios").select("id, nome").in("id", advogadoIds)) : [];
  const usuariosMap = new Map(usuarios.map((usuario) => [usuario.id, usuario.nome]));
  const grupos = new Map<string, { total: number; ativos: number; encerrados: number }>();
  for (const processo of processos) {
    const responsavel = processo.advogado_id ? usuariosMap.get(processo.advogado_id) ?? "Sem responsável" : "Sem responsável";
    const atual = grupos.get(responsavel) ?? { total: 0, ativos: 0, encerrados: 0 };
    atual.total += 1;
    if (processo.status === "ativo") atual.ativos += 1;
    if (processo.status === "encerrado") atual.encerrados += 1;
    grupos.set(responsavel, atual);
  }
  const linhas: Array<Array<string | number>> = [...grupos.entries()].sort((a, b) => b[1].total - a[1].total).map(([nome, values]) => [nome, values.total, values.ativos, values.encerrados]);
  return { titulo: "Processos por responsável", cabecalhos: ["Responsável", "Total", "Ativos", "Encerrados"], linhas, resumo: `${processos.length} processos cadastrados no período` };
}
