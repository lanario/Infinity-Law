import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClientesLoading() {
  return (
    <div className="min-h-screen bg-[#fbfaf8] dark:bg-zinc-950">
      <Header title="Clientes" />
      <p className="sr-only" role="status" aria-live="polite">
        Carregando lista de clientes...
      </p>

      <main
        aria-busy="true"
        className="mx-auto max-w-[1720px] space-y-4 px-3 py-4 sm:space-y-5 sm:px-6 sm:py-6 lg:px-8"
      >
        {/* Grid de 3 mini cards métricos no topo */}
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-2xl border border-stone-200/80 bg-white px-4 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:px-5"
            >
              <Skeleton className="h-8 w-1 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-6 w-16 rounded" />
                <Skeleton className="h-3 w-32 rounded" />
              </div>
              <Skeleton className="h-5 w-5 rounded-lg" />
            </div>
          ))}
        </div>

        {/* Barra de busca e filtros */}
        <div className="flex flex-col gap-3 rounded-2xl border border-stone-200/80 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4">
          <Skeleton className="h-10 w-full sm:max-w-xl rounded-xl" />
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <Skeleton className="h-10 w-36 rounded-xl" />
            <Skeleton className="h-10 w-20 rounded-xl" />
          </div>
        </div>

        {/* Botão Novo Cliente */}
        <div className="flex justify-end">
          <Skeleton className="h-11 w-full sm:w-36 rounded-xl" />
        </div>

        {/* Tabela de clientes estruturada */}
        <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="divide-y divide-stone-100 dark:divide-zinc-800">
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
                  <div className="space-y-1.5 min-w-0">
                    <Skeleton className="h-4 w-40 sm:w-56 rounded" />
                    <Skeleton className="h-3 w-24 sm:w-32 rounded" />
                  </div>
                </div>

                <div className="hidden md:block">
                  <Skeleton className="h-3.5 w-32 rounded font-mono" />
                </div>

                <div className="hidden lg:block">
                  <Skeleton className="h-3.5 w-28 rounded" />
                </div>

                <div className="flex items-center gap-3">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
