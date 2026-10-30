import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";

export default function AgendaLoading() {
  return (
    <div className="min-h-screen bg-[#fbfaf8] dark:bg-zinc-950">
      <Header title="Agenda" />
      <p className="sr-only" role="status" aria-live="polite">
        Carregando agenda de compromissos e prazos...
      </p>

      <main
        aria-busy="true"
        className="mx-auto max-w-[1720px] space-y-4 px-3 py-4 sm:space-y-5 sm:px-6 sm:py-6 lg:px-8"
      >
        {/* Barra de ferramentas: Navegação de data + Seletor de visualização (Mês/Semana/Dia/Equipe) + Botão Novo */}
        <div className="flex flex-col gap-3 rounded-2xl border border-stone-200/80 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-16 rounded-xl" />
            <div className="flex items-center gap-1">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <Skeleton className="h-9 w-9 rounded-xl" />
            </div>
            <Skeleton className="h-5 w-44 rounded ml-2" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-xl border border-stone-200 p-1 dark:border-zinc-800">
              <Skeleton className="h-8 w-14 rounded-lg" />
              <Skeleton className="h-8 w-16 rounded-lg" />
              <Skeleton className="h-8 w-14 rounded-lg" />
              <Skeleton className="h-8 w-16 rounded-lg" />
            </div>
            <Skeleton className="h-9 w-32 rounded-xl" />
          </div>
        </div>

        {/* Grid de calendário de alta fidelidade */}
        <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {/* Cabeçalho dos dias da semana (Seg - Dom) */}
          <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50/70 text-center dark:border-zinc-800 dark:bg-zinc-900/60">
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((dia) => (
              <div key={dia} className="py-2.5 px-2">
                <Skeleton className="mx-auto h-3.5 w-8 rounded" />
              </div>
            ))}
          </div>

          {/* Grid de células do mês (5 semanas x 7 dias) */}
          <div className="grid grid-cols-7 divide-x divide-y divide-stone-100 dark:divide-zinc-800/80">
            {Array.from({ length: 35 }, (_, index) => (
              <div
                key={index}
                className="min-h-[92px] sm:min-h-[110px] p-2 flex flex-col justify-between"
              >
                <div className="flex justify-between items-start">
                  <Skeleton className="h-4 w-4 rounded" />
                </div>
                {index % 3 === 0 && (
                  <div className="space-y-1 mt-auto pt-1">
                    <Skeleton className="h-5 w-full rounded" />
                    {index % 6 === 0 && <Skeleton className="h-5 w-4/5 rounded" />}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
