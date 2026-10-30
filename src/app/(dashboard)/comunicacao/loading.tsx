import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";

export default function ComunicacaoLoading() {
  return (
    <div className="min-h-screen bg-[#fbfaf8] dark:bg-zinc-950">
      <Header title="Comunicação" />
      <p className="sr-only" role="status" aria-live="polite">
        Carregando painel de comunicação e mensagens...
      </p>

      <main
        aria-busy="true"
        className="mx-auto max-w-[1720px] space-y-5 p-4 sm:p-6"
      >
        {/* Painel superior: Compositor WhatsApp + Gerenciador de Templates */}
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,.85fr)]">
          {/* Compositor */}
          <section className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5 space-y-4">
            <div className="space-y-1.5 mb-2">
              <Skeleton className="h-4 w-36 rounded" />
              <Skeleton className="h-3 w-64 rounded" />
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-28 rounded" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>

              <div className="space-y-1.5">
                <Skeleton className="h-3 w-32 rounded" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>

              <div className="space-y-1.5">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-28 w-full rounded-xl" />
              </div>

              <div className="flex justify-end pt-2">
                <Skeleton className="h-10 w-44 rounded-xl" />
              </div>
            </div>
          </section>

          {/* Gerenciador de Templates */}
          <section className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32 rounded" />
                <Skeleton className="h-3 w-48 rounded" />
              </div>
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>

            <div className="space-y-2.5">
              {Array.from({ length: 3 }, (_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-stone-100 p-3 dark:border-zinc-800/80 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3.5 w-32 rounded" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-full rounded" />
                  <Skeleton className="h-3 w-2/3 rounded" />
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Histórico recente de conversas */}
        <section className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-stone-100 px-4 py-4 dark:border-zinc-800 sm:px-5">
            <div className="space-y-1">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-3 w-56 rounded" />
            </div>
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>

          <div className="divide-y divide-stone-100 dark:divide-zinc-800">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
                <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3.5 w-40 rounded" />
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
