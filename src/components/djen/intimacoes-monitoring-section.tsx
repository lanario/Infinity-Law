import { useState, type FormEvent } from "react";
import {
  BellRing,
  CalendarDays,
  LoaderCircle,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { BRAZILIAN_UFS } from "@/lib/djen/validation";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Message, Monitoramento } from "./types";

interface DjenMonitoringSectionProps {
  monitoramentos: Monitoramento[];
  podeEditar: boolean;
  podeExcluir: boolean;
  today: string;
  dataInicio: string;
  dataFim: string;
  onDataInicioChange: (value: string) => void;
  onDataFimChange: (value: string) => void;
  numeroOab: string;
  onNumeroOabChange: (value: string) => void;
  ufOab: string;
  onUfOabChange: (value: string) => void;
  saving: boolean;
  syncingMonitorId: string | null;
  updatingMonitorId: string | null;
  deletingMonitorId: string | null;
  message: Message | null;
  loadError: string | null;
  onAddMonitor: (event: FormEvent<HTMLFormElement>) => void;
  onSynchronize: (monitoramento: Monitoramento) => void;
  onSetMonitorActive: (monitoramento: Monitoramento, ativo: boolean) => void;
  onDeleteMonitor: (monitoramento: Monitoramento) => Promise<string | null>;
}

function formatDateTime(value: string | null) {
  if (!value) return "Ainda não consultada";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : "Ainda não consultada";
}

export function DjenMonitoringSection({
  monitoramentos,
  podeEditar,
  podeExcluir,
  today,
  dataInicio,
  dataFim,
  onDataInicioChange,
  onDataFimChange,
  numeroOab,
  onNumeroOabChange,
  ufOab,
  onUfOabChange,
  saving,
  syncingMonitorId,
  updatingMonitorId,
  deletingMonitorId,
  message,
  loadError,
  onAddMonitor,
  onSynchronize,
  onSetMonitorActive,
  onDeleteMonitor,
}: DjenMonitoringSectionProps) {
  const [deleteTarget, setDeleteTarget] = useState<Monitoramento | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function confirmDeleteMonitor() {
    if (!deleteTarget || deletingMonitorId) return;

    setDeleteError(null);
    const error = await onDeleteMonitor(deleteTarget);
    if (error) {
      setDeleteError(error);
      return;
    }

    setDeleteTarget(null);
  }

  return (
    <section className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_8px_24px_-20px_rgba(23,25,26,.4)] dark:border-zinc-800 dark:bg-zinc-900 sm:p-5 lg:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#17191a] text-gold dark:bg-[#D4AF37]/15 dark:text-[#E5C158]">
          <BellRing className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-black text-[#17191a] dark:text-zinc-100 sm:text-base">Monitoramento por OAB</h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-stone-500 dark:text-zinc-400">
            Consulte manualmente as comunicações públicas do Diário de Justiça Eletrônico Nacional.
            Cada OAB é consultada separadamente; as publicações repetidas ficam salvas uma só vez e
            mantêm o vínculo com todas as OABs que as localizaram.
          </p>
        </div>
      </div>

      {loadError && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs leading-5 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200" role="status">
          {loadError}
        </div>
      )}

      {podeEditar && (
        <form onSubmit={onAddMonitor} className="mt-5 grid gap-4 border-t border-stone-100 pt-5 dark:border-zinc-800 lg:grid-cols-[minmax(0,1fr)_10rem_auto] lg:items-start">
          <label className="min-w-0 text-xs font-semibold text-stone-600 dark:text-zinc-300">
            Número da OAB
            <input
              value={numeroOab}
              onChange={(event) => onNumeroOabChange(event.target.value)}
              maxLength={12}
              required
              autoComplete="off"
              placeholder="Ex.: 123456 ou 123456A"
              className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-stone-50/60 px-3 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 hover:border-stone-300 hover:bg-white focus:border-gold focus:bg-white focus:ring-4 focus:ring-gold/15 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:focus:bg-zinc-900"
            />
            <span className="mt-1.5 block text-[11px] font-normal leading-4 text-stone-400 dark:text-zinc-500">
              Só o número da OAB do advogado (não o número do processo).
            </span>
          </label>
          <label className="min-w-0 text-xs font-semibold text-stone-600 dark:text-zinc-300">
            Seccional
            <select
              value={ufOab}
              onChange={(event) => onUfOabChange(event.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-stone-50/60 px-3 text-sm text-stone-800 outline-none transition hover:border-stone-300 hover:bg-white focus:border-gold focus:bg-white focus:ring-4 focus:ring-gold/15 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:focus:bg-zinc-900"
            >
              {BRAZILIAN_UFS.map((uf) => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={saving || !numeroOab.trim()}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#17191a] px-4 text-xs font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#303334] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/20 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 lg:mt-[1.375rem] lg:w-auto"
          >
            {saving ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
            Adicionar OAB
          </button>
        </form>
      )}

      <div className="mt-5 rounded-2xl border border-stone-200/80 bg-stone-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-800/60 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-soft text-gold-dark dark:bg-[#D4AF37]/15 dark:text-[#E5C158]">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="text-xs font-black text-[#17191a] dark:text-zinc-100">Período da consulta</h3>
            <p className="mt-1 text-[11px] leading-4 text-stone-500 dark:text-zinc-400">
              Defina as datas de início e fim para esta consulta DJEN.
            </p>
          </div>
        </div>
        <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(12rem,auto)] lg:items-end">
          <DatePicker label="De" value={dataInicio} max={today} onChange={onDataInicioChange} className="min-w-0 w-full" inputClassName="bg-white dark:bg-zinc-900 dark:text-zinc-100" />
          <DatePicker label="Até" value={dataFim} max={today} onChange={onDataFimChange} className="min-w-0 w-full" inputClassName="bg-white dark:bg-zinc-900 dark:text-zinc-100" />
          <p className="rounded-xl border border-stone-100 bg-white/80 px-3.5 py-2.5 text-xs leading-5 text-stone-500 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-400 sm:col-span-2 lg:col-span-1">
            <span className="font-semibold text-stone-700 dark:text-zinc-200">Janela padrão:</span> últimos 7 dias.
            Máximo de 30 dias.
          </p>
        </div>
      </div>

      {loadError ? null : monitoramentos.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-stone-300 bg-stone-50/50 px-5 py-8 text-center dark:border-zinc-800 dark:bg-zinc-900/60">
          <p className="text-sm font-bold text-stone-700 dark:text-zinc-200">Nenhuma OAB cadastrada</p>
          <p className="mt-1 text-xs leading-5 text-stone-500 dark:text-zinc-400">Adicione uma seccional para começar a consultar publicações.</p>
        </div>
      ) : (
        <div className="mt-5 grid gap-3">
          {monitoramentos.map((monitoramento) => {
            const isSyncing = syncingMonitorId === monitoramento.id;
            const isUpdating = updatingMonitorId === monitoramento.id;
            const isBusy = Boolean(syncingMonitorId || updatingMonitorId || deletingMonitorId);
            return (
              <article key={monitoramento.id} className="grid min-w-0 gap-4 rounded-2xl border border-stone-200/80 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-[#17191a] dark:text-zinc-100">
                      OAB {monitoramento.numero_oab}/{monitoramento.uf_oab}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      monitoramento.ativo
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                        : "bg-stone-100 text-stone-500 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}>
                      {monitoramento.ativo ? "Ativa" : "Pausada"}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-4 text-stone-500 dark:text-zinc-400">
                    Última consulta concluída: {formatDateTime(monitoramento.ultima_sincronizacao_em)}
                  </p>
                </div>

                {(podeEditar || podeExcluir) && (
                  <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row lg:flex-wrap lg:justify-end">
                    {podeEditar && (
                      <>
                        <button
                          type="button"
                          onClick={() => onSetMonitorActive(monitoramento, !monitoramento.ativo)}
                          disabled={isBusy}
                          className="inline-flex h-10 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-600 transition hover:border-gold/40 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 lg:w-auto"
                        >
                          {isUpdating ? (
                            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                          ) : monitoramento.ativo ? (
                            <Pause className="h-3.5 w-3.5" />
                          ) : (
                            <Play className="h-3.5 w-3.5" />
                          )}
                          {monitoramento.ativo ? "Pausar" : "Reativar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => onSynchronize(monitoramento)}
                          disabled={!monitoramento.ativo || isBusy}
                          className="inline-flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gold px-3 text-xs font-bold text-[#17191a] transition hover:-translate-y-0.5 hover:bg-gold-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/20 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                          {isSyncing ? "Consultando…" : "Consultar DJEN"}
                        </button>
                      </>
                    )}
                    {podeExcluir && (
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteTarget(monitoramento);
                          setDeleteError(null);
                        }}
                        disabled={isBusy}
                        aria-label={`Excluir monitoramento da OAB ${monitoramento.numero_oab}/${monitoramento.uf_oab}`}
                        className="inline-flex h-10 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20 lg:w-auto"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Excluir
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {message && (
        <div
          className={`mt-4 rounded-xl border px-3.5 py-2.5 text-xs leading-5 ${
            message.kind === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
          }`}
          role={message.kind === "error" ? "alert" : "status"}
          aria-live={message.kind === "error" ? "assertive" : "polite"}
        >
          {message.text}
        </div>
      )}

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deletingMonitorId) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent showCloseButton={false} className="dashboard-root max-w-md gap-5 rounded-2xl border border-stone-200 bg-white p-5 text-stone-800 shadow-[0_24px_70px_-28px_rgba(23,25,26,.4)] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-sm font-black text-[#17191a] dark:text-zinc-100 sm:text-base">Excluir OAB do monitoramento?</DialogTitle>
            <DialogDescription className="text-xs leading-5 text-stone-500 dark:text-zinc-400">
              {deleteTarget && (
                <>
                  A OAB <span className="font-mono font-medium text-gray-800 dark:text-zinc-200">{deleteTarget.numero_oab}/{deleteTarget.uf_oab}</span> será removida da lista.
                  As intimações salvas permanecem no histórico; apenas os vínculos de localização desta OAB serão removidos.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs leading-5 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              {deleteError}
            </p>
          )}

          <DialogFooter className="flex-col sm:flex-row">
            <button
              type="button"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteError(null);
              }}
              disabled={Boolean(deletingMonitorId)}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-stone-200 bg-white px-4 text-xs font-semibold text-stone-600 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmDeleteMonitor}
              disabled={!deleteTarget || Boolean(deletingMonitorId)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-xs font-bold text-white transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deletingMonitorId ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
              {deletingMonitorId ? "Excluindo…" : "Excluir monitoramento"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
