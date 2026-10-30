import { BriefcaseBusiness, FileText, UserRound } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClienteFichaLoading() {
  return (
    <div className="min-h-screen bg-[#fbfaf8] dark:bg-zinc-950">
      <Header title="Prontuário do cliente" />
      <p className="sr-only" role="status" aria-live="polite">
        <UserRound className="inline h-4 w-4" aria-hidden="true" /> Carregando os dados do prontuário do cliente.
      </p>

      <main
        aria-busy="true"
        className="mx-auto max-w-[1720px] space-y-4 px-3 py-4 sm:space-y-5 sm:px-6 sm:py-6 lg:px-8"
      >
        {/* Card do Cliente (Avatar + Nome + Subtítulo) */}
        <section className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:rounded-3xl">
          <div className="flex items-center gap-4 p-4 sm:p-6">
            <Skeleton className="h-14 w-14 shrink-0 rounded-2xl sm:h-16 sm:w-16" />
            <div className="min-w-0 flex-1 space-y-2.5">
              <Skeleton className="h-2.5 w-32 rounded" />
              <Skeleton className="h-6 w-2/3 max-w-80 rounded" />
              <Skeleton className="h-3 w-1/2 max-w-64 rounded" />
            </div>
          </div>
        </section>

        {/* Abas de navegação do prontuário */}
        <div className="flex gap-1 overflow-hidden rounded-2xl border border-stone-200/80 bg-white p-1.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {["w-24", "w-28", "w-28", "w-32", "w-28"].map((width, index) => (
            <Skeleton key={index} className={`h-10 shrink-0 rounded-xl ${width}`} />
          ))}
        </div>

        {/* 4 Cards de métricas do cliente */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <section
              key={item}
              className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-2"
            >
              <Skeleton className="h-3 w-28 rounded" />
              <Skeleton className="h-6 w-24 rounded" />
              <Skeleton className="h-3 w-36 rounded" />
            </section>
          ))}
        </div>

        {/* Seção de processos vinculados */}
        <section className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2 border-b border-stone-100 px-4 py-4 dark:border-zinc-800 sm:px-5">
            <BriefcaseBusiness className="h-4 w-4 text-[#D4AF37]" aria-hidden="true" />
            <Skeleton className="h-4 w-36 rounded" />
          </div>
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-stone-100 p-4 dark:border-zinc-800/80 space-y-4"
              >
                <div className="flex gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FBF6E9] text-[#9A7A1A] dark:bg-[#D4AF37]/10 dark:text-[#D4AF37]">
                    <FileText className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-28 rounded" />
                    <Skeleton className="h-4 w-3/4 rounded" />
                  </div>
                </div>
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
