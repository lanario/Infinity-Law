import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/server/current-profile";
import { DashboardHeaderRapport } from "@/components/dashboard/dashboard-header-rapport";
import {
  KPIBannerRapport,
  type KPIBannerRapportData,
} from "@/components/dashboard/kpi-banner-rapport";
import type { CourtTrendDataPoint } from "@/components/dashboard/court-trends-chart";
import type { LegalAreaDistributionItem } from "@/components/dashboard/areas-distribution-card";
import { CourtTrendsChart, AreasDistributionCard } from "@/components/dashboard/lazy-charts";
import {
  CriticalDocketCard,
  type DocketEventItem,
} from "@/components/dashboard/critical-docket-card";
import {
  CnjRadarCard,
  type RadarMovementItem,
} from "@/components/dashboard/cnj-radar-card";
import { QuickDock } from "@/components/dashboard/quick-dock";

export const metadata: Metadata = {
  title: "Dashboard · Infinity Law",
  description: "Indicadores e atividade do escritório",
};

interface DashboardData {
  kpiData: KPIBannerRapportData;
  processosAtivos: number;
  prazosEventos: DocketEventItem[];
  radarMovements: RadarMovementItem[];
  areasDistribution: LegalAreaDistributionItem[];
  trends: CourtTrendDataPoint[];
  hasTrendRecords: boolean;
}

type DashboardResult =
  | { status: "ok"; data: DashboardData }
  | { status: "error"; error: string };

const EVENT_WINDOW_LIMIT = 1000;
const AREA_PALETTE = ["#17191A", "#D4AF37", "#8B6914", "#6B7280", "#D1D5DB"];

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function makeTrendBuckets(start: Date, now: Date): CourtTrendDataPoint[] {
  return Array.from({ length: 6 }, (_, index) => {
    const bucketStart = new Date(start);
    bucketStart.setUTCDate(bucketStart.getUTCDate() + index * 5);
    const bucketEnd = new Date(bucketStart);
    bucketEnd.setUTCDate(bucketEnd.getUTCDate() + 4);
    if (bucketEnd > now) bucketEnd.setTime(now.getTime());

    const formatDate = (value: Date) =>
      new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        timeZone: "UTC",
      }).format(value);

    return {
      label: `${formatDate(bucketStart)}–${formatDate(bucketEnd)}`,
      honorarios: 0,
      movimentacoes: 0,
    };
  });
}

function bucketIndex(value: string, start: Date) {
  const date = new Date(value.length === 10 ? `${value}T00:00:00.000Z` : value);
  const daysFromStart = Math.floor((date.getTime() - start.getTime()) / 86_400_000);
  return Math.min(5, Math.max(0, Math.floor(daysFromStart / 5)));
}

type DashboardProfile = NonNullable<Awaited<ReturnType<typeof getCurrentProfile>>>;

// Módulo sem leitura: resultado vazio com a mesma forma das consultas (cartões recebem zeros/listas vazias).
const NO_ACCESS = Promise.resolve({ data: null, count: 0, error: null });

async function getDashboardData(profile: DashboardProfile): Promise<DashboardResult> {
  // Resolve the authenticated session before handling query failures. This page
  // must remain request-rendered because the server client reads the session cookie.
  const supabase = createClient();
  const canClientes = profile.can("clientes", "read");
  const canProcessos = profile.can("processos", "read");
  const canFinanceiro = profile.can("financeiro", "read");
  const canAgenda = profile.can("agenda", "read");
  try {
    const now = new Date();
    const today = dateOnly(now);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
    const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const chartStart = new Date(now);
    chartStart.setUTCDate(chartStart.getUTCDate() - 29);
    chartStart.setUTCHours(0, 0, 0, 0);
    const chartStartDate = dateOnly(chartStart);

    const [
      clientsRes,
      processesRes,
      receivableRes,
      paidReceiptsRes,
      eventWindowRes,
      eventsRes,
      recentMovementsRes,
      trendMovementsRes,
      areasRes,
      processesByAreaRes,
    ] = await Promise.all([
      canClientes
        ? supabase.from("clientes").select("id", { count: "exact", head: true }).eq("ativo", true)
        : NO_ACCESS,
      canProcessos
        ? supabase.from("processos").select("id", { count: "exact", head: true }).eq("status", "ativo")
        : NO_ACCESS,
      canFinanceiro
        ? supabase.from("parcelas").select("valor").in("status", ["pendente", "vencido"])
        : NO_ACCESS,
      canFinanceiro
        ? supabase
            .from("parcelas")
            .select("valor, data_pagamento")
            .eq("status", "pago")
            .not("data_pagamento", "is", null)
            .gte("data_pagamento", chartStartDate)
            .lte("data_pagamento", today)
        : NO_ACCESS,
      // Uma única consulta da janela [início de hoje, hoje+7d]; as 6 contagens de prazos/audiências saem daqui (no JS).
      // PostgREST limita a 1000 linhas por resposta (ver aviso abaixo se atingido).
      canAgenda
        ? supabase
            .from("eventos")
            .select("tipo, inicio, link_videoconf")
            .in("tipo", ["prazo", "audiencia"])
            .gte("inicio", todayStart.toISOString())
            .lte("inicio", inSevenDays.toISOString())
            .limit(EVENT_WINDOW_LIMIT)
        : NO_ACCESS,
      canAgenda
        ? supabase
            .from("eventos")
            .select(`
              id, titulo, tipo, inicio, fim, processo_id, local, link_videoconf, descricao,
              processos!eventos_processo_id_fkey (numero_cnj, tribunal, comarca, vara),
              usuarios!eventos_criado_por_fkey (nome)
            `)
            .in("tipo", ["prazo", "audiencia"])
            .gte("inicio", now.toISOString())
            .lte("inicio", inSevenDays.toISOString())
            .order("inicio", { ascending: true })
            .limit(12)
        : NO_ACCESS,
      canProcessos
        ? supabase
            .from("processo_movimentacoes")
            .select(`
              id, processo_id, descricao, fonte, data_movimento,
              processos!processo_movimentacoes_processo_id_fkey (numero_cnj, tribunal)
            `)
            .order("data_movimento", { ascending: false })
            .limit(8)
        : NO_ACCESS,
      canProcessos
        ? supabase
            .from("processo_movimentacoes")
            .select("data_movimento")
            .gte("data_movimento", chartStart.toISOString())
            .lte("data_movimento", now.toISOString())
        : NO_ACCESS,
      canProcessos ? supabase.from("areas_direito").select("id, nome") : NO_ACCESS,
      canProcessos
        ? supabase.from("processos").select("area_direito_id").eq("status", "ativo")
        : NO_ACCESS,
    ]);

    const queryResults = [
      ["Clientes", clientsRes],
      ["Processos", processesRes],
      ["Honorários", receivableRes],
      ["Recebimentos", paidReceiptsRes],
      ["Prazos e audiências", eventWindowRes],
      ["Agenda", eventsRes],
      ["Movimentações", recentMovementsRes],
      ["Histórico de movimentações", trendMovementsRes],
      ["Áreas do direito", areasRes],
      ["Processos por área", processesByAreaRes],
    ] as const;
    const failedQueries = queryResults.filter(([, result]) => result.error);

    if (failedQueries.length > 0) {
      console.error(
        "[Dashboard] Falha nas consultas:",
        failedQueries.map(([name, result]) => ({ name, error: result.error }))
      );
      return {
        status: "error",
        error: `Não foi possível carregar: ${failedQueries.map(([name]) => name).join(", ")}.`,
      };
    }

    const windowEvents = (eventWindowRes.data ?? []).map((event) => ({
      tipo: event.tipo as string,
      inicio: new Date(event.inicio as string).getTime(),
      virtual: event.link_videoconf !== null,
    }));
    if (windowEvents.length >= EVENT_WINDOW_LIMIT) {
      console.warn("[Dashboard] Janela de eventos atingiu o limite; contagens podem estar truncadas.");
    }
    const nowMs = now.getTime();
    const countEvents = (tipo: string, fromMs: number, toMs: number, inclusiveEnd: boolean, onlyVirtual = false) =>
      windowEvents.filter(
        (event) =>
          event.tipo === tipo &&
          event.inicio >= fromMs &&
          (inclusiveEnd ? event.inicio <= toMs : event.inicio < toMs) &&
          (!onlyVirtual || event.virtual)
      ).length;
    const tomorrowMs = tomorrowStart.getTime();

    const kpiData: KPIBannerRapportData = {
      honorariosAReceber: (receivableRes.data ?? []).reduce(
        (sum, parcela) => sum + (parcela.valor ?? 0),
        0
      ),
      processosAtivos: processesRes.count ?? 0,
      prazosCriticos: countEvents("prazo", nowMs, in48Hours.getTime(), true),
      prazosHoje: countEvents("prazo", todayStart.getTime(), tomorrowMs, false),
      prazosAmanha: countEvents("prazo", tomorrowMs, tomorrowEnd.getTime(), false),
      audienciasSemana: countEvents("audiencia", nowMs, inSevenDays.getTime(), true),
      audienciasAmanha: countEvents("audiencia", tomorrowMs, tomorrowEnd.getTime(), false),
      audienciasVirtuais: countEvents("audiencia", nowMs, inSevenDays.getTime(), true, true),
      totalClientes: clientsRes.count ?? 0,
    };

    const prazosEventos: DocketEventItem[] = (eventsRes.data ?? []).map((event) => {
      const process = Array.isArray(event.processos) ? event.processos[0] : event.processos;
      const user = Array.isArray(event.usuarios) ? event.usuarios[0] : event.usuarios;
      return {
        id: event.id,
        titulo: event.titulo,
        tipo: event.tipo,
        inicio: event.inicio,
        fim: event.fim,
        processo_id: event.processo_id,
        processo: process
          ? {
              numero_cnj: process.numero_cnj ?? "Número CNJ não informado",
              tribunal: process.tribunal,
              comarca: process.comarca,
              vara: process.vara,
            }
          : null,
        responsavel: user?.nome ?? null,
        local: event.local,
        link_videoconf: event.link_videoconf,
        descricao: event.descricao,
      };
    });

    const radarMovements: RadarMovementItem[] = (recentMovementsRes.data ?? []).map((movement) => {
      const process = Array.isArray(movement.processos)
        ? movement.processos[0]
        : movement.processos;
      const description = movement.descricao;
      return {
        id: movement.id,
        processo_id: movement.processo_id,
        numero_cnj: process?.numero_cnj ?? "Número CNJ não informado",
        tribunal: process?.tribunal ?? "Tribunal não informado",
        tipo: "movimentacao",
        titulo: description.length > 55 ? `${description.slice(0, 55)}…` : description,
        resumo: description,
        data_hora: movement.data_movimento,
        fonte: movement.fonte || undefined,
      };
    });

    const countsByArea = new Map<number, number>();
    for (const process of processesByAreaRes.data ?? []) {
      if (process.area_direito_id !== null) {
        countsByArea.set(
          process.area_direito_id,
          (countsByArea.get(process.area_direito_id) ?? 0) + 1
        );
      }
    }
    const areasDistribution: LegalAreaDistributionItem[] = (areasRes.data ?? [])
      .map((area, index) => ({
        id: area.id,
        nome: area.nome,
        processos: countsByArea.get(area.id) ?? 0,
        cor: AREA_PALETTE[index % AREA_PALETTE.length] ?? AREA_PALETTE[0]!,
      }))
      .filter((area) => area.processos > 0)
      .sort((a, b) => b.processos - a.processos);

    const trends = makeTrendBuckets(chartStart, now);
    for (const receipt of paidReceiptsRes.data ?? []) {
      if (!receipt.data_pagamento) continue;
      const bucket = trends[bucketIndex(receipt.data_pagamento, chartStart)];
      if (bucket) bucket.honorarios += receipt.valor ?? 0;
    }
    for (const movement of trendMovementsRes.data ?? []) {
      const bucket = trends[bucketIndex(movement.data_movimento, chartStart)];
      if (bucket) bucket.movimentacoes += 1;
    }

    return {
      status: "ok",
      data: {
        kpiData,
        processosAtivos: processesRes.count ?? 0,
        prazosEventos,
        radarMovements,
        areasDistribution,
        trends,
        hasTrendRecords:
          (paidReceiptsRes.data?.length ?? 0) > 0 ||
          (trendMovementsRes.data?.length ?? 0) > 0,
      },
    };
  } catch (error) {
    console.error("[Dashboard] Erro inesperado ao carregar dados:", error);
    return {
      status: "error",
      error: "Não foi possível carregar os dados do dashboard. Tente novamente.",
    };
  }
}

export default async function DashboardPage() {
  const profile = await getCurrentProfile().catch((error) => {
    console.error("[Dashboard] Falha ao carregar perfil:", error);
    return "error" as const;
  });
  if (!profile) redirect("/login");
  const result: DashboardResult =
    profile === "error"
      ? { status: "error", error: "Não foi possível carregar os dados do dashboard. Tente novamente." }
      : await getDashboardData(profile);

  return (
    <div className="relative min-h-screen rapport-mesh selection:bg-[#D4AF37]/20 selection:text-stone-900 dark:selection:text-white pb-28">
      <div className="rapport-glow-gold -top-32 right-1/4 h-[520px] w-[520px] opacity-70" aria-hidden="true" />
      <div className="rapport-glow-pine top-96 -left-24 h-[560px] w-[560px] opacity-60" aria-hidden="true" />
      <div className="rapport-glow-gold bottom-48 right-12 h-[420px] w-[420px] opacity-50" aria-hidden="true" />

      <DashboardHeaderRapport />

      <main className="mx-auto max-w-[1720px] px-4 sm:px-6 lg:px-8 py-6 space-y-7 relative z-10">
        {result.status === "error" ? (
          <section
            role="alert"
            className="rounded-2xl border border-rose-200 bg-white p-6 text-rose-900 shadow-sm dark:border-rose-900 dark:bg-zinc-900 dark:text-rose-200"
          >
            <h2 className="text-base font-bold">Dados indisponíveis</h2>
            <p className="mt-1 text-sm">{result.error}</p>
            <Link href="/dashboard" className="mt-4 inline-flex text-sm font-bold underline">
              Tentar novamente
            </Link>
          </section>
        ) : (
          <>
            <section aria-label="Indicadores do escritório">
              <KPIBannerRapport kpis={result.data.kpiData} />
            </section>

            <section
              aria-label="Histórico financeiro e carteira processual"
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
            >
              <div className="lg:col-span-7 xl:col-span-8">
                <CourtTrendsChart
                  className="h-full min-h-[380px]"
                  data={result.data.trends}
                  hasRecords={result.data.hasTrendRecords}
                />
              </div>
              <div className="lg:col-span-5 xl:col-span-4">
                <AreasDistributionCard
                  className="h-full min-h-[380px]"
                  data={result.data.areasDistribution}
                  totalAtivos={result.data.processosAtivos}
                />
              </div>
            </section>

            <section
              aria-label="Agenda e movimentações dos processos"
              className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch"
            >
              <div className="xl:col-span-7">
                <CriticalDocketCard className="h-full min-h-[460px]" events={result.data.prazosEventos} />
              </div>
              <div className="xl:col-span-5">
                <CnjRadarCard className="h-full min-h-[460px]" movements={result.data.radarMovements} />
              </div>
            </section>
          </>
        )}
      </main>

      <QuickDock position="bottom" />
    </div>
  );
}
