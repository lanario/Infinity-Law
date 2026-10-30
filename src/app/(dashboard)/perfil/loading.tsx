import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";

export default function PerfilLoading() {
  return (
    <div className="min-h-screen bg-[#fbfaf8] dark:bg-zinc-950">
      <Header title="Meu perfil" />
      <p className="sr-only" role="status" aria-live="polite">
        Carregando informações do perfil...
      </p>

      <main
        aria-busy="true"
        className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6"
      >
        {/* Card do Perfil com Avatar e Dados Principais */}
        <section className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Skeleton className="h-20 w-20 shrink-0 rounded-full" />
            <div className="space-y-2 flex-1 min-w-0">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-6 w-48 rounded" />
              <Skeleton className="h-5 w-36 rounded-full" />
              <Skeleton className="h-3.5 w-44 rounded" />
            </div>
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        </section>

        {/* Card do Formulário de Dados Pessoais */}
        <section className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3 dark:border-zinc-800">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-32 rounded" />
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-28 rounded" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-32 rounded" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-20 rounded" />
                <div className="flex gap-2">
                  <Skeleton className="h-11 flex-1 rounded-xl" />
                  <Skeleton className="h-11 flex-1 rounded-xl" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-stone-100 dark:border-zinc-800">
            <Skeleton className="h-11 w-44 rounded-xl" />
          </div>
        </section>
      </main>
    </div>
  );
}
