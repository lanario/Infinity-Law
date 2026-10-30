import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProcessoDetalheLoading() {
  return (
    <div className="min-h-screen bg-[#fbfaf8] dark:bg-zinc-950">
      <Header title="Detalhes do Processo" />
      <p className="sr-only" role="status" aria-live="polite">
        Carregando detalhes do processo...
      </p>

      <main aria-busy="true" className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-3.5 w-36 rounded" />
        </div>

        {/* Card de resumo: CNJ, status, ações e metadados */}
        <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-6 w-56 rounded font-mono" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-9 w-28 rounded-xl" />
            </div>
          </div>

          {/* Grid de informações (Tribunal, Vara, Área, Fase, UF, Advogado) */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 pt-4 border-t border-gray-100 dark:border-zinc-800">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-3.5 w-3.5 rounded" />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
                <Skeleton className="h-4 w-28 rounded" />
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center gap-2 border-t border-gray-100 pt-4 dark:border-zinc-800">
            <Skeleton className="h-2 w-2 rounded-full" />
            <Skeleton className="h-3 w-48 rounded" />
          </div>
        </section>

        {/* Tabs de navegação / seções */}
        <div className="flex gap-2 border-b border-gray-200 pb-2 dark:border-zinc-800">
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>

        {/* Bloco principal de conteúdo: Movimentações / Histórico */}
        <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-zinc-800">
            <Skeleton className="h-5 w-40 rounded" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>

          <div className="space-y-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="flex items-start gap-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-800/30"
              >
                <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-48 rounded" />
                    <Skeleton className="h-3 w-24 rounded" />
                  </div>
                  <Skeleton className="h-3 w-4/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
