import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProcessosLoading() {
  return (
    <div className="min-h-screen bg-[#fbfaf8]">
      <Header title="Processos" />
      <main aria-busy="true" className="mx-auto max-w-[1720px] space-y-4 px-3 py-4 sm:space-y-5 sm:px-6 sm:py-6 lg:px-8">
        <Skeleton className="h-14 rounded-2xl motion-reduce:animate-none" />
        <div className="space-y-2 rounded-2xl border border-stone-200/80 bg-white p-3">
          {Array.from({ length: 7 }, (_, i) => <Skeleton key={i} className="h-16 rounded-xl motion-reduce:animate-none" />)}
        </div>
      </main>
    </div>
  );
}
