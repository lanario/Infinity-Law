"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const NovoProcessoForm = dynamic(() => import("@/components/processos/novo-processo-form").then((m) => m.NovoProcessoForm), {
  ssr: false,
  loading: () => <div className="min-h-0 flex-1 space-y-4 p-6"><Skeleton className="h-10 rounded-xl motion-reduce:animate-none" /><Skeleton className="h-64 rounded-2xl motion-reduce:animate-none" /></div>,
});

interface Area {
  id: number;
  nome: string;
}

interface ClienteOption {
  id: string;
  nome: string;
  tipo: string;
}

interface ResponsavelOption {
  id: string;
  nome: string;
}

export function NovoProcessoDialog({
  areas,
  clientes,
  responsaveis,
  currentUserId,
  isIntercepted,
}: {
  areas: Area[];
  clientes: ClienteOption[];
  responsaveis: ResponsavelOption[];
  currentUserId: string | null;
  isIntercepted: boolean;
}) {
  const router = useRouter();
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  function requestClose() {
    if (saving) return;
    if (dirty && !window.confirm("Há informações não salvas. Deseja descartar o preenchimento?")) return;

    if (isIntercepted) {
      router.back();
      return;
    }

    router.replace("/processos");
  }

  return (
    <Dialog open onOpenChange={(open) => !open && requestClose()}>
      <DialogContent
        initialFocus={() => document.getElementById("novo-processo-dialog-title")}
        showCloseButton={false}
        className="dashboard-root fixed left-0 right-0 top-0 z-50 flex h-[100dvh] max-h-[100dvh] w-screen max-w-none -translate-x-0 -translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-white p-0 text-stone-800 outline-none dark:bg-zinc-900 dark:text-zinc-100 sm:left-1/2 sm:right-auto sm:top-1/2 sm:h-[min(94dvh,960px)] sm:max-h-[min(94dvh,960px)] sm:w-[calc(100vw-2rem)] sm:max-w-5xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:border-stone-200 sm:shadow-2xl sm:dark:border-zinc-800"
      >
        <DialogHeader className="shrink-0 border-b border-stone-100 bg-gradient-to-br from-white to-stone-50/80 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-900 sm:px-6 sm:py-5">
          <div className="flex items-start gap-3 pr-10">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-soft text-gold-dark dark:bg-[#D4AF37]/15 dark:text-[#E5C158]">
              <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gold-dark dark:text-[#E5C158]">Entrada de caso</p>
              <DialogTitle
                id="novo-processo-dialog-title"
                tabIndex={-1}
                className="mt-0.5 text-base font-black tracking-tight text-[#17191a] outline-none dark:text-zinc-100 sm:text-lg"
              >
                Solicitar novo processo
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs text-stone-500 dark:text-zinc-400">
                Registre as informações do cliente e do pedido. Número CNJ e valores podem ser incluídos depois.
              </DialogDescription>
            </div>
          </div>

          <button
            type="button"
            onClick={requestClose}
            disabled={saving}
            aria-label="Fechar criação de processo"
            className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] inline-flex h-9 w-9 items-center justify-center rounded-xl text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/25 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 sm:right-4 sm:top-4"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </DialogHeader>

        <NovoProcessoForm
          areas={areas}
          clientes={clientes}
          responsaveis={responsaveis}
          currentUserId={currentUserId}
          onDirtyChange={setDirty}
          onSavingChange={setSaving}
          onCancel={requestClose}
        />
      </DialogContent>
    </Dialog>
  );
}
