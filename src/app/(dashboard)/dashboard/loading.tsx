import { DashboardHeaderRapport } from "@/components/dashboard/dashboard-header-rapport";
import { QuickDock } from "@/components/dashboard/quick-dock";
import { Skeleton } from "@/components/ui/skeleton";

function KpiSkeleton() {
  return (
    <article className="flex min-h-48 flex-col rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-10 w-10 shrink-0 rounded-xl motion-reduce:animate-none" />
        <Skeleton className="h-3 w-3/5 rounded motion-reduce:animate-none" />
      </div>
      <Skeleton className="mt-4 h-7 w-2/5 rounded motion-reduce:animate-none" />
      <Skeleton className="mt-2 h-3 w-4/5 rounded motion-reduce:animate-none" />
      <div className="mt-auto pt-4">
        <Skeleton className="h-3 w-24 rounded motion-reduce:animate-none" />
      </div>
    </article>
  );
}

function ChartSkeleton() {
  return (
    <section className="min-h-[380px] rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-52 rounded motion-reduce:animate-none" />
          <Skeleton className="h-3 w-40 rounded motion-reduce:animate-none" />
        </div>
        <Skeleton className="h-6 w-28 rounded-full motion-reduce:animate-none" />
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-xl motion-reduce:animate-none" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-20 rounded motion-reduce:animate-none" />
            <Skeleton className="h-4 w-24 rounded motion-reduce:animate-none" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-xl motion-reduce:animate-none" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-20 rounded motion-reduce:animate-none" />
            <Skeleton className="h-4 w-24 rounded motion-reduce:animate-none" />
          </div>
        </div>
      </div>
      <Skeleton className="h-64 w-full rounded-xl motion-reduce:animate-none" />
    </section>
  );
}

function AreasSkeleton() {
  return (
    <section className="min-h-[380px] rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-40 rounded motion-reduce:animate-none" />
          <Skeleton className="h-3 w-32 rounded motion-reduce:animate-none" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full motion-reduce:animate-none" />
      </div>
      <div className="my-5 flex justify-center">
        <Skeleton className="h-44 w-44 rounded-full motion-reduce:animate-none" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-3 w-4/5 rounded motion-reduce:animate-none" />
        <Skeleton className="h-3 w-3/5 rounded motion-reduce:animate-none" />
      </div>
    </section>
  );
}

function FeedSkeleton({ rows }: { rows: number }) {
  return (
    <section className="min-h-[460px] rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4 dark:border-zinc-800">
        <div className="space-y-2">
          <Skeleton className="h-4 w-44 rounded motion-reduce:animate-none" />
          <Skeleton className="h-3 w-36 rounded motion-reduce:animate-none" />
        </div>
        <Skeleton className="h-7 w-24 rounded-full motion-reduce:animate-none" />
      </div>
      <div className="divide-y divide-gray-100 dark:divide-zinc-800">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-start gap-3 py-4">
            <Skeleton className="h-10 w-10 shrink-0 rounded-xl motion-reduce:animate-none" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-4/5 rounded motion-reduce:animate-none" />
              <Skeleton className="h-3 w-3/5 rounded motion-reduce:animate-none" />
            </div>
            <Skeleton className="h-3 w-14 shrink-0 rounded motion-reduce:animate-none" />
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
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 5 }, (_, index) => (
              <KpiSkeleton key={index} />
            ))}
          </section>

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
