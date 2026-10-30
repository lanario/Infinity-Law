import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";

export default function FinanceiroLoading() {
  return (
    <div className="min-h-screen bg-[#fbfaf8] dark:bg-zinc-950">
      <Header title="Financeiro" />
      <p className="sr-only" role="status" aria-live="polite">
        Carregando informações financeiras...
      </p>

      <main
        aria-busy="true"
        className="mx-auto max-w-[1720px] space-y-5 px-3 py-4 sm:px-6 sm:py-6 lg:px-8"
      >
        {/* Topo: Título da seção + Seletor de mês */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-28 rounded" />
            <Skeleton className="h-7 w-56 rounded" />
            <Skeleton className="h-3.5 w-72 rounded" />
          </div>
          <Skeleton className="h-11 w-full sm:w-60 rounded-xl" />
        </div>

        {/* Abas Financeiro / Honorários */}
        <div className="flex gap-1">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>

        {/* 4 Cards de KPIs Financeiros no Topo */}
        <div className="grid gap-3 lg:grid-cols-4">
          {/* Card Resultado do Mês (ocupa 2 colunas) */}
          <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6 lg:col-span-2 space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-3 w-32 rounded" />
                <Skeleton className="h-9 w-44 rounded" />
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-16 rounded" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-16 rounded" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            </div>
          </div>

          {/* Card Receitas */}
          <div className="flex min-h-[150px] flex-col justify-between rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-16 rounded" />
              <Skeleton className="h-7 w-32 rounded" />
              <Skeleton className="h-3 w-24 rounded" />
            </div>
          </div>

          {/* Card Despesas */}
          <div className="flex min-h-[150px] flex-col justify-between rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-16 rounded" />
              <Skeleton className="h-7 w-32 rounded" />
              <Skeleton className="h-3 w-24 rounded" />
            </div>
          </div>
        </div>

        {/* Filtros de período e tipo (Receitas / Despesas) */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1">
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-44 rounded-xl" />
            <Skeleton className="h-10 w-36 rounded-xl" />
          </div>
        </div>

        {/* 3 mini cards métricos da aba ativa */}
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-2 sm:p-5"
            >
              <Skeleton className="h-8 w-8 rounded-xl" />
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-6 w-28 rounded" />
            </div>
          ))}
        </div>

        {/* Tabela de lançamentos / parcelas */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
          <div className="mb-4 flex items-center justify-between border-b border-stone-100 pb-3 dark:border-zinc-800">
            <Skeleton className="h-5 w-36 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
          </div>
          <div className="divide-y divide-stone-100 dark:divide-zinc-800">
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
                  <div className="space-y-1.5 min-w-0">
                    <Skeleton className="h-4 w-48 sm:w-64 rounded" />
                    <Skeleton className="h-3 w-32 rounded" />
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <div className="space-y-1 sm:text-right">
                    <Skeleton className="h-4 w-24 rounded font-mono" />
                    <Skeleton className="h-3 w-20 rounded" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
