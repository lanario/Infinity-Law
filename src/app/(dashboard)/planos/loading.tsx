import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";

export default function PlanosLoading() {
  return (
    <div className="min-h-screen bg-[#fbfaf8] dark:bg-zinc-950">
      <Header title="Planos" />
      <p className="sr-only" role="status" aria-live="polite">
        Carregando informações da assinatura e planos...
      </p>

      <main aria-busy="true" className="mx-auto max-w-4xl p-4 sm:p-6">
        <section className="overflow-hidden rounded-3xl border border-stone-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {/* Topo do Card de Assinatura */}
          <div className="p-6 sm:p-9 space-y-4">
            <Skeleton className="h-12 w-12 rounded-2xl" />
            <Skeleton className="h-3 w-36 rounded" />
            <Skeleton className="h-7 w-40 rounded" />
            <div className="flex items-center gap-3 pt-2">
              <Skeleton className="h-9 w-48 rounded-lg" />
              <Skeleton className="h-7 w-20 rounded-full" />
            </div>
          </div>

          {/* Base com detalhes do plano */}
          <div className="border-t border-stone-100 p-6 sm:p-9 dark:border-zinc-800 space-y-4">
            <div className="flex items-start gap-3 rounded-2xl border border-stone-100 bg-stone-50/80 p-4 sm:p-5 dark:border-zinc-800 dark:bg-zinc-800/40">
              <Skeleton className="mt-0.5 h-5 w-5 shrink-0 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-60 rounded" />
                <Skeleton className="h-3 w-full rounded" />
              </div>
            </div>
            <Skeleton className="h-3 w-72 rounded" />
          </div>
        </section>
      </main>
    </div>
  );
}
