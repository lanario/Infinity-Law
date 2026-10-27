import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";

export default function FinanceiroLoading() {
  return (
    <div className="min-h-screen bg-[#fbfaf8]">
      <Header title="Financeiro" />
      <main aria-busy="true" className="mx-auto max-w-[1720px] space-y-4 px-3 py-4 sm:space-y-5 sm:px-6 sm:py-6 lg:px-8">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24 rounded-2xl motion-reduce:animate-none" />)}
        </div>
        <div className="space-y-2 rounded-2xl border border-stone-200/80 bg-white p-3">
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl motion-reduce:animate-none" />)}
        </div>
      </main>
    </div>
  );
}
