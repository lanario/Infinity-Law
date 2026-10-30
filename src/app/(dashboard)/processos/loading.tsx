import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProcessosLoading() {
  return (
    <div className="min-h-screen bg-[#fbfaf8] dark:bg-zinc-950">
      <Header title="Processos" />
      <p className="sr-only" role="status" aria-live="polite">
        Carregando lista de processos...
      </p>

      <main
        aria-busy="true"
        className="mx-auto max-w-[1720px] space-y-4 px-3 py-4 sm:space-y-5 sm:px-6 sm:py-6 lg:px-8"
      >
        {/* Barra de filtros: busca + cliente + status + alternador de view + botão novo processo */}
        <div className="flex flex-col gap-3 rounded-2xl border border-stone-200/80 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <Skeleton className="h-10 w-full sm:w-72 rounded-xl" />
            <Skeleton className="h-10 w-full sm:w-56 rounded-xl" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-36 rounded-xl" />
            <Skeleton className="hidden sm:block h-10 w-20 rounded-xl" />
            <Skeleton className="h-10 w-36 rounded-xl" />
          </div>
        </div>

        {/* Tabela estruturada com 7 linhas de processos */}
        <div className="divide-y divide-stone-100 rounded-2xl border border-stone-200/80 bg-white shadow-sm dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {Array.from({ length: 7 }, (_, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                <div className="space-y-1.5 min-w-0">
                  <Skeleton className="h-4 w-44 sm:w-56 rounded" />
                  <Skeleton className="h-3 w-32 sm:w-40 rounded" />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 sm:gap-6">
                <div className="space-y-1 sm:text-right">
                  <Skeleton className="h-3.5 w-48 sm:w-52 rounded" />
                  <Skeleton className="h-3 w-36 rounded" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-4 w-4 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
