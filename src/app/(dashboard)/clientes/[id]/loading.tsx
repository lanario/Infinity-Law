import { BriefcaseBusiness, FileText, UserRound } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClienteFichaLoading() {
  return (
    <div className="min-h-screen bg-[#fbfaf8]">
      <Header title="Prontuário do cliente" />
      <main aria-busy="true" className="mx-auto max-w-[1720px] space-y-4 px-3 py-4 sm:space-y-5 sm:px-6 sm:py-6 lg:px-8">
        <section className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_12px_36px_-26px_rgba(23,25,26,0.4)] sm:rounded-3xl">
          <div className="flex items-center gap-4 p-4 sm:p-6">
            <Skeleton className="h-14 w-14 shrink-0 rounded-2xl bg-gold-soft motion-reduce:animate-none sm:h-16 sm:w-16" />
            <div className="min-w-0 flex-1 space-y-2.5">
              <Skeleton className="h-2.5 w-32 rounded motion-reduce:animate-none" />
              <Skeleton className="h-6 w-2/3 max-w-80 rounded motion-reduce:animate-none" />
              <Skeleton className="h-3 w-1/2 max-w-64 rounded motion-reduce:animate-none" />
            </div>
          </div>
        </section>

        <div className="flex gap-1 overflow-hidden rounded-2xl border border-stone-200/80 bg-white p-1.5">
          {["w-24", "w-28", "w-28", "w-32", "w-28"].map((width, index) => <Skeleton key={index} className={`h-10 shrink-0 rounded-xl ${width} motion-reduce:animate-none`} />)}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => <section key={item} className="rounded-2xl border border-stone-200/80 bg-white p-4"><Skeleton className="h-3 w-28 rounded motion-reduce:animate-none" /><Skeleton className="mt-3 h-6 w-24 rounded motion-reduce:animate-none" /><Skeleton className="mt-2 h-3 w-36 rounded motion-reduce:animate-none" /></section>)}
        </div>

        <section className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white">
          <div className="flex items-center gap-2 border-b border-stone-100 px-4 py-4 sm:px-5"><BriefcaseBusiness className="h-4 w-4 text-gold-dark" aria-hidden="true" /><Skeleton className="h-4 w-36 rounded motion-reduce:animate-none" /></div>
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
            {[0, 1, 2, 3].map((item) => <div key={item} className="rounded-2xl border border-stone-100 p-4"><div className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-soft text-gold-dark"><FileText className="h-4 w-4" aria-hidden="true" /></span><div className="flex-1 space-y-2"><Skeleton className="h-3 w-28 rounded motion-reduce:animate-none" /><Skeleton className="h-4 w-3/4 rounded motion-reduce:animate-none" /></div></div><Skeleton className="mt-5 h-16 w-full rounded-xl motion-reduce:animate-none" /></div>)}
          </div>
        </section>
        <p className="sr-only" role="status" aria-live="polite"><UserRound className="inline h-4 w-4" aria-hidden="true" /> Carregando os dados do prontuário do cliente.</p>
      </main>
    </div>
  );
}
