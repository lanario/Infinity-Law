import { DashboardHeaderRapport } from "@/components/dashboard/dashboard-header-rapport";
import { QuickDock } from "@/components/dashboard/quick-dock";
import { Skeleton } from "@/components/ui/skeleton";

function HeroKpiSkeleton() {
  return (
    <article className="lg:col-span-5 xl:col-span-5 flex flex-col justify-between rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 relative overflow-hidden">
      {/* Topo: Miniatura do ícone + título + link Ver financeiro */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
          <Skeleton className="h-4 w-40 rounded" />
        </div>
        <Skeleton className="h-4 w-24 rounded" />
      </div>

      {/* Meio: Valor grande + placeholder de variação + sparkline */}
      <div className="my-5 flex items-center justify-between gap-4 flex-1">
        <div className="space-y-2">
          <Skeleton className="h-9 w-44 rounded-lg" />
          <Skeleton className="h-3.5 w-32 rounded" />
        </div>
        <div className="shrink-0 flex items-center justify-end">
          <Skeleton className="w-28 sm:w-36 h-10 rounded-lg" />
        </div>
      </div>

      {/* Base: Separador com os dois blocos A vencer e Em atraso */}
      <div className="border-t border-gray-100 dark:border-zinc-800/80 pt-4 mt-auto grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-16 rounded" />
          <Skeleton className="h-6 w-28 rounded" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-16 rounded" />
          <Skeleton className="h-6 w-28 rounded" />
        </div>
      </div>
    </article>
  );
}

function SatelliteKpiSkeleton() {
  return (
    <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between">
      {/* Topo: Ícone + Título + Tag de variação + Ação */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
          <Skeleton className="h-3.5 w-28 rounded" />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-5 w-5 rounded-full" />
        </div>
      </div>

      {/* Meio/Base: Valor numérico e texto de detalhe */}
      <div className="my-auto py-2 space-y-1.5">
        <Skeleton className="h-8 w-20 rounded" />
        <Skeleton className="h-3 w-36 rounded" />
      </div>
    </article>
  );
}

function KpiBannerSkeleton() {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch" aria-label="Carregando indicadores">
      <HeroKpiSkeleton />
      <div className="lg:col-span-7 xl:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
        {Array.from({ length: 4 }, (_, index) => (
          <SatelliteKpiSkeleton key={index} />
        ))}
      </div>
    </section>
  );
}

function ChartSkeleton() {
  return (
    <section className="min-h-[380px] rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-52 rounded" />
          <Skeleton className="h-3 w-40 rounded" />
        </div>
        <Skeleton className="h-6 w-28 rounded-full" />
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-4 w-24 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-4 w-24 rounded" />
          </div>
        </div>
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </section>
  );
}

function AreasSkeleton() {
  return (
    <section className="min-h-[380px] rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-40 rounded" />
          <Skeleton className="h-3 w-32 rounded" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="my-5 flex justify-center">
        <Skeleton className="h-44 w-44 rounded-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-3 w-4/5 rounded" />
        <Skeleton className="h-3 w-3/5 rounded" />
      </div>
    </section>
  );
}

function FeedSkeleton({ rows }: { rows: number }) {
  return (
    <section className="min-h-[460px] rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4 dark:border-zinc-800">
        <div className="space-y-2">
          <Skeleton className="h-4 w-44 rounded" />
          <Skeleton className="h-3 w-36 rounded" />
        </div>
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>
      <div className="divide-y divide-gray-100 dark:divide-zinc-800">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-start gap-3 py-4">
            <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-4/5 rounded" />
              <Skeleton className="h-3 w-3/5 rounded" />
            </div>
            <Skeleton className="h-3 w-14 shrink-0 rounded" />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function DashboardLoading() {
  return (
    <div className="relative min-h-screen rapport-mesh pb-28">
      <div className="rapport-glow-gold -top-32 right-1/4 h-[520px] w-[520px] opacity-70" aria-hidden="true" />
      <div className="rapport-glow-pine top-96 -left-24 h-[560px] w-[560px] opacity-60" aria-hidden="true" />
      <div className="rapport-glow-gold bottom-48 right-12 h-[420px] w-[420px] opacity-50" aria-hidden="true" />

      <DashboardHeaderRapport />
      <p className="sr-only" role="status" aria-live="polite">
        Carregando indicadores e atividade do escritório.
      </p>

      <main
        aria-busy="true"
        className="mx-auto max-w-[1720px] space-y-7 px-4 py-6 relative z-10 sm:px-6 lg:px-8"
      >
        <div aria-hidden="true" className="space-y-7">
          <KpiBannerSkeleton />

          <section className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7 xl:col-span-8">
              <ChartSkeleton />
            </div>
            <div className="lg:col-span-5 xl:col-span-4">
              <AreasSkeleton />
            </div>
          </section>

          <section className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-12">
            <div className="xl:col-span-7">
              <FeedSkeleton rows={3} />
            </div>
            <div className="xl:col-span-5">
              <FeedSkeleton rows={4} />
            </div>
          </section>
        </div>
      </main>

      <QuickDock position="bottom" />
    </div>
  );
}
