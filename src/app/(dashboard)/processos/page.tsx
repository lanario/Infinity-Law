import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/server/current-profile";
import { Header } from "@/components/layout/header";
import { ProcessosList, type ProcessoListItem } from "@/components/processos/processos-list";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { logQueryFailures, queryErrorGuidance } from "@/lib/server/query-error-state.mjs";
import { PROCESSOS_LIST_SELECT, PROCESSOS_LIST_SELECT_SEM_HONORARIOS } from "@/lib/server/processos-list-select.mjs";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Processos" };

interface PageProps {
  searchParams: { search?: string; status?: string };
}

type Joined<T> = T | T[] | null;

interface ProcessoQueryRow {
  id: string;
  numero_cnj: string | null;
  numero_protocolo: string | null;
  processo_originario: string | null;
  pasta_caso: string | null;
  data_requerimento: string | null;
  grupo_acao: string | null;
  tipo_acao: string | null;
  classe_processual: string | null;
  etapa: string | null;
  status: string;
  fase: string | null;
  tribunal: string | null;
  vara: string | null;
  ultima_sync_cnj: string | null;
  valor_causa: number | null;
  observacoes: string | null;
  areas_direito: Joined<{ nome: string }>;
  usuarios: Joined<{ nome: string }>;
  processo_clientes: Array<{
    papel: string | null;
    clientes: Joined<{ id: string; nome: string }>;
  }> | null;
  honorarios: Array<{
    valor_fixo: number | null;
    percentual_exito: number | null;
    contingenciamento: string | null;
  }> | null;
}

function first<T>(relation: Joined<T>): T | null {
  if (Array.isArray(relation)) return relation[0] ?? null;
  return relation;
}

export default async function ProcessosPage({ searchParams }: PageProps) {
  const supabase = createClient();
  const profile = await getCurrentProfile().catch((profileError) => {
    console.error("[ProcessosPage] Falha ao carregar perfil:", profileError);
    return "error" as const;
  });
  if (profile === "error") {
    return (
      <div>
        <Header title="Processos" />
        <div className="p-4 sm:p-6"><QueryErrorState retryHref="/processos" /></div>
      </div>
    );
  }
  if (!profile) redirect("/login");
  if (!profile.can("processos", "read")) redirect("/dashboard");

  // Sem financeiro.read, honorários nem são buscados.
  const { data, error } = await supabase
    .from("processos")
    .select(
      profile.can("financeiro", "read") ? PROCESSOS_LIST_SELECT : PROCESSOS_LIST_SELECT_SEM_HONORARIOS
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    logQueryFailures("ProcessosPage", [{ operation: "processos-list", error }]);
    const guidance = queryErrorGuidance(error);
    return (
      <div>
        <Header title="Processos" />
        <div className="p-4 sm:p-6">
          <QueryErrorState retryHref="/processos" {...guidance} />
        </div>
      </div>
    );
  }

  const rows = (data ?? []) as unknown as ProcessoQueryRow[];
  const processos: ProcessoListItem[] = rows.map((processo) => ({
    id: processo.id,
    numero_cnj: processo.numero_cnj,
    numero_protocolo: processo.numero_protocolo,
    processo_originario: processo.processo_originario,
    pasta_caso: processo.pasta_caso,
    data_requerimento: processo.data_requerimento,
    grupo_acao: processo.grupo_acao,
    tipo_acao: processo.tipo_acao,
    classe_processual: processo.classe_processual,
    etapa: processo.etapa,
    status: processo.status,
    fase: processo.fase,
    tribunal: processo.tribunal,
    vara: processo.vara,
    ultima_sync_cnj: processo.ultima_sync_cnj,
    valor_causa: processo.valor_causa,
    observacoes: processo.observacoes,
    areas_direito: first(processo.areas_direito),
    usuarios: first(processo.usuarios),
    clientes: (processo.processo_clientes ?? []).flatMap((vinculo) => {
      const cliente = first(vinculo.clientes);
      return cliente ? [{ ...cliente, papel: vinculo.papel }] : [];
    }),
    honorarios: processo.honorarios?.[0] ?? null,
  }));

  return (
    <div>
      <Header title="Processos" />
      <div className="p-4 sm:p-6">
        <ProcessosList
          processos={processos}
          currentSearch={searchParams.search ?? ""}
          currentStatus={searchParams.status ?? "ativo"}
        />
      </div>
    </div>
  );
}
