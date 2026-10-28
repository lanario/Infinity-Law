"use client";

import { useRouter } from "next/navigation";
import { ExternalLink, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function ProcessoDetalheDialog({ titulo, id, children }: { titulo: string; id: string; children: React.ReactNode }) {
  const router = useRouter();

  return (
    <Dialog open onOpenChange={(open) => !open && router.back()}>
      <DialogContent
        showCloseButton={false}
        className="fixed left-0 right-0 top-0 z-50 flex h-[100dvh] max-h-[100dvh] w-screen max-w-none -translate-x-0 -translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-gray-50 p-0 text-stone-800 outline-none sm:left-1/2 sm:right-auto sm:top-1/2 sm:h-auto sm:max-h-[min(90dvh,900px)] sm:w-[calc(100vw-2rem)] sm:max-w-4xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:border-stone-200 sm:shadow-2xl"
      >
        <DialogHeader className="sticky top-0 z-10 shrink-0 border-b border-stone-100 bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 sm:py-4">
          <div className="flex items-center gap-3 pr-10">
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate font-mono text-base font-bold text-[#17191a]">{titulo}</DialogTitle>
              <DialogDescription className="mt-0.5 text-xs text-stone-500">Detalhes do processo</DialogDescription>
            </div>
            {/* <a> proposital: navegação completa, não interceptada pelo modal. */}
            <a
              href={`/processos/${id}`}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/25"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              Abrir em tela cheia
            </a>
          </div>
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Fechar detalhes do processo"
            className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] inline-flex h-9 w-9 items-center justify-center rounded-xl text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/25 sm:right-4 sm:top-3"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
