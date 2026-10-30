import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { DjenIntimacoesPanel } from "@/components/djen/intimacoes-panel";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/server/current-profile";
import { getSaoPauloDate } from "@/lib/djen/validation";

export const metadata: Metadata = { title: "Intimações" };

export default async function IntimacoesPage() {
  const supabase = createClient();
  const today = getSaoPauloDate();
  const defaultStart = new Date(`${today}T00:00:00.000Z`);
  defaultStart.setUTCDate(defaultStart.getUTCDate() - 6);
  const defaultStartDate = defaultStart.toISOString().slice(0, 10);

  const [profile, monitoramentosResult, publicacoesResult] = await Promise.all([
    getCurrentProfile(),
    supabase
      .from("djen_oab_monitoramentos")
      .select("id, numero_oab, uf_oab, ativo, ultima_tentativa_em, ultima_sincronizacao_em")
      .order("created_at", { ascending: true }),
    supabase
      .from("djen_publicacoes")
      .select(
        "id, processo_id, numero_processo, numero_processo_com_mascara, data_disponibilizacao, tribunal, tipo_comunicacao, orgao, texto, meio, meio_completo, link, tipo_documento, nome_classe, codigo_classe, numero_comunicacao, comunicacao_ativa, destinatarios, destinatario_advogados"
      )
      .order("data_disponibilizacao", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (!profile) redirect("/login");

  const canRead = profile.can("comunicacao", "read");
  const canWrite = profile.can("comunicacao", "write");
  const canDelete = profile.can("comunicacao", "delete");
  const canReadClients = profile.can("clientes", "read");
  const canReadProcesses = profile.can("processos", "read");
  const canWriteProcesses = profile.can("processos", "write");

  if (!canRead) redirect("/dashboard");

  const monitoramentos = monitoramentosResult.data ?? [];
  const publicacoes = publicacoesResult.data ?? [];
  const publicacaoIds = publicacoes.map((publicacao) => publicacao.id);
  const processIds = Array.from(
    new Set(publicacoes.map((publicacao) => publicacao.processo_id).filter(Boolean))
  );

  const [associationsResult, processesResult] = await Promise.all([
    publicacaoIds.length > 0
      ? supabase
          .from("djen_publicacoes_monitoramentos")
          .select("publicacao_id, monitoramento_id")
          .in("publicacao_id", publicacaoIds)
      : Promise.resolve({ data: [], error: null }),
    canReadProcesses && processIds.length > 0
      ? supabase.from("processos").select("id, numero_cnj").in("id", processIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const publicationError = publicacoesResult.error
    ? "Não foi possível carregar as publicações salvas. Atualize a página e tente novamente."
    : null;
  const monitoringError = monitoramentosResult.error
    ? "Não foi possível carregar os monitoramentos por OAB. Atualize a página e tente novamente."
    : null;
  const relatedDataError = associationsResult.error || processesResult.error
    ? "Os vínculos com monitoramentos ou processos não puderam ser carregados. As publicações são apresentadas conforme o estado informado abaixo. Atualize a página para tentar carregar os dados relacionados novamente."
    : null;

  return (
    <div>
      <Header title="Intimações" />
      <main className="mx-auto max-w-[1720px] space-y-4 px-3 py-4 sm:space-y-5 sm:px-6 sm:py-6 lg:px-8">
        <DjenIntimacoesPanel
          monitoramentos={monitoramentos}
          publicacoes={publicacoes}
          associacoes={associationsResult.data ?? []}
          processos={processesResult.data ?? []}
          podeEditar={Boolean(canWrite)}
          podeExcluir={Boolean(canDelete)}
          podePesquisarCliente={Boolean(canRead && canReadClients)}
          podeLerProcessos={Boolean(canReadProcesses)}
          podeAssociarProcesso={Boolean(canWrite && canReadClients && canReadProcesses && canWriteProcesses)}
          today={today}
          defaultStartDate={defaultStartDate}
          publicationError={publicationError}
          monitoringError={monitoringError}
          relatedDataError={relatedDataError}
        />
      </main>
    </div>
  );
}
