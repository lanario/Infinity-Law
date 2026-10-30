import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";

export default function ConfiguracoesLoading() {
  return (
    <div className="min-h-screen bg-[#fbfaf8] dark:bg-zinc-950">
      <Header title="Configurações" />
      <p className="sr-only" role="status" aria-live="polite">
        Carregando configurações do sistema...
      </p>

      <main
        aria-busy="true"
        className="mx-auto max-w-[1720px] p-4 sm:p-6"
      >
        <div className="grid items-start gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          {/* Navegação lateral de seções */}
          <nav
            aria-label="Carregando seções de configurações"
            className="rounded-2xl border border-stone-200/80 bg-white p-2.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="px-3 pb-2 pt-2">
              <Skeleton className="h-3 w-20 rounded" />
            </div>
            <div className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
              {Array.from({ length: 5 }, (_, i) => (
                <div
                  key={i}
                  className="flex min-w-[172px] items-center gap-3 rounded-xl p-3 lg:min-w-0"
                >
                  <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <Skeleton className="h-3.5 w-28 rounded" />
                    <Skeleton className="h-2.5 w-20 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </nav>

          {/* Painel de conteúdo da seção ativa */}
          <section className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4 dark:border-zinc-800">
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-36 rounded" />
                <Skeleton className="h-3.5 w-64 rounded" />
              </div>
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24 rounded" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24 rounded" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
              </div>

              <div className="space-y-2">
                <Skeleton className="h-3 w-32 rounded" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>

              <div className="space-y-2">
                <Skeleton className="h-3 w-28 rounded" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </div>
            </div>

            <div className="flex justify-end border-t border-stone-100 pt-4 dark:border-zinc-800">
              <Skeleton className="h-10 w-36 rounded-xl" />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
