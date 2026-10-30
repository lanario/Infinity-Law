import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";

export default function IntimacoesLoading() {
  return (
    <div className="min-h-screen bg-[#fbfaf8] dark:bg-zinc-950">
      <Header title="Intimações" />
      <p className="sr-only" role="status" aria-live="polite">
        Carregando intimações e monitoramentos do DJEN...
      </p>

      <main
        aria-busy="true"
        className="mx-auto max-w-[1720px] space-y-5 px-3 py-4 sm:px-6 sm:py-6 lg:px-8"
      >
        {/* Barra de status de monitoramento e sincronização */}
        <section className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-44 rounded" />
                <Skeleton className="h-3 w-60 rounded" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-44 rounded-xl" />
              <Skeleton className="h-10 w-32 rounded-xl" />
            </div>
          </div>
        </section>

        {/* Barra de filtros de publicações */}
        <div className="flex flex-col gap-3 rounded-2xl border border-stone-200/80 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <Skeleton className="h-10 w-full sm:max-w-md rounded-xl" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-36 rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        </div>

        {/* Lista de publicações do DJEN */}
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <article
              key={i}
              className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-3.5 w-32 rounded" />
                </div>
                <Skeleton className="h-3.5 w-28 rounded" />
              </div>

              <div className="space-y-2">
                <Skeleton className="h-4 w-52 sm:w-64 rounded font-mono" />
                <Skeleton className="h-3 w-full rounded" />
                <Skeleton className="h-3 w-4/5 rounded" />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-zinc-800">
                <Skeleton className="h-3 w-36 rounded" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-28 rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
