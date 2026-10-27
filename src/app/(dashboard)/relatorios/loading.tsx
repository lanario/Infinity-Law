import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";

export default function RelatoriosLoading() {
  return (
    <div className="min-h-screen bg-[#fbfaf8]">
      <Header title="Relatórios" />
      <main aria-busy="true" className="mx-auto max-w-[1720px] space-y-4 px-3 py-4 sm:space-y-5 sm:px-6 sm:py-6 lg:px-8">
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-24 rounded-2xl motion-reduce:animate-none" />)}
        </div>
        <Skeleton className="h-80 rounded-2xl motion-reduce:animate-none" />
      </main>
    </div>
  );
}
