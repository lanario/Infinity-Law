import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";

export default function RelatoriosLoading() {
  return (
    <div className="min-h-screen bg-[#fbfaf8] dark:bg-zinc-950">
      <Header title="Relatórios" />
      <p className="sr-only" role="status" aria-live="polite">
        Carregando painel de relatórios...
      </p>

      <main aria-busy="true" className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
        {/* 3 mini cards métricos no topo */}
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-2xl border border-stone-200/80 bg-white px-4 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <Skeleton className="h-8 w-1 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-5 w-20 rounded" />
                <Skeleton className="h-3 w-32 rounded" />
              </div>
              <Skeleton className="h-4 w-4 rounded" />
            </div>
          ))}
        </div>

        {/* Card principal de geração e exportação de relatório */}
        <section className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-36 rounded" />
              <Skeleton className="h-3 w-56 rounded" />
            </div>
          </div>

          <div className="space-y-2">
            <Skeleton className="h-3.5 w-28 rounded" />
            <div className="grid gap-2 md:grid-cols-3">
              {Array.from({ length: 3 }, (_, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-xl border border-stone-200 p-3.5 dark:border-zinc-800"
                >
                  <Skeleton className="mt-0.5 h-4 w-4 shrink-0 rounded" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3.5 w-3/4 rounded" />
                    <Skeleton className="h-3 w-full rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-stone-100 pt-4 dark:border-zinc-800 sm:flex-row sm:justify-end">
            <Skeleton className="h-10 w-32 rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        </section>
      </main>
    </div>
  );
}
