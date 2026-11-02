"use client";

import { useState, type FormEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  BellRing,
  CalendarDays,
  CheckCircle2,
  Clock,
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
  const reduceMotion = useReducedMotion() ?? false;
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
    <div className="space-y-6">
      {/* Card Principal de Gerenciamento de OABs */}
      <section className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm dark:border-zinc-800/80 dark:bg-[#17191A] sm:p-6">
        <div className="flex items-start gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gold/10 text-gold-dark dark:bg-gold/15 dark:text-[#E5C158]">
            <BellRing className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-stone-900 dark:text-zinc-100 sm:text-lg">
              Monitoramento Contínuo por OAB
            </h2>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-stone-500 dark:text-zinc-400">
              Cadastre e gerencie as OABs do seu escritório para consultar publicações no DJEN.
              Cada OAB é sincronizada individualmente; intimações duplicadas são unificadas sem perda de histórico.
            </p>
          </div>
        </div>

        {loadError && (
          <div
            className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs leading-5 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
            role="status"
          >
            {loadError}
          </div>
        )}

        {/* Formulário de Adicionar Nova OAB */}
        {podeEditar && (
          <form
            onSubmit={onAddMonitor}
            className="mt-6 grid gap-4 rounded-2xl border border-stone-200/70 bg-stone-50/60 p-4 dark:border-zinc-800/80 dark:bg-[#101213] sm:p-5 lg:grid-cols-[minmax(0,1fr)_10rem_auto] lg:items-start"
          >
            <label className="min-w-0 text-xs font-semibold text-stone-700 dark:text-zinc-300">
              Número da OAB
              <input
                value={numeroOab}
                onChange={(event) => onNumeroOabChange(event.target.value)}
                maxLength={12}
                required
                autoComplete="off"
                placeholder="Ex.: 123456 ou 123456A"
                className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-white px-3.5 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 hover:border-stone-300 focus:border-gold focus:ring-4 focus:ring-gold/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-zinc-600"
              />
              <span className="mt-1.5 block text-[11px] font-normal leading-4 text-stone-400 dark:text-zinc-500">
                Apenas os dígitos da inscrição (e sufixo de letra se houver).
              </span>
            </label>

            <label className="min-w-0 text-xs font-semibold text-stone-700 dark:text-zinc-300">
              Seccional (UF)
              <select
                value={ufOab}
                onChange={(event) => onUfOabChange(event.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-900 outline-none transition hover:border-stone-300 focus:border-gold focus:ring-4 focus:ring-gold/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600"
              >
                {BRAZILIAN_UFS.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              disabled={saving || !numeroOab.trim()}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gold px-5 text-xs font-bold text-[#17191A] shadow-sm transition hover:bg-gold-hover hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/25 disabled:cursor-not-allowed disabled:opacity-50 lg:mt-[1.375rem] lg:w-auto"
            >
              {saving ? (
                <LoaderCircle className="h-4 w-4 animate-spin text-[#17191A]" aria-hidden="true" />
              ) : (
                <Plus className="h-4 w-4 text-[#17191A]" aria-hidden="true" />
              )}
              Adicionar OAB
            </button>
          </form>
        )}

        {/* Parâmetros do Período de Sincronização */}
        <div className="mt-5 rounded-2xl border border-stone-200/70 bg-stone-50/50 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/40 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold-dark dark:bg-gold/15 dark:text-[#E5C158]">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-stone-900 dark:text-zinc-100 sm:text-sm">
                Janela Temporal de Consulta
              </h3>
              <p className="mt-0.5 text-[11px] leading-4 text-stone-500 dark:text-zinc-400">
                Determina o intervalo de datas enviado ao DJEN durante a sincronização das OABs.
              </p>
            </div>
          </div>
          <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(12rem,auto)] lg:items-end">
            <DatePicker
              label="Data de Início"
              value={dataInicio}
              max={today}
              onChange={onDataInicioChange}
              className="min-w-0 w-full"
              inputClassName="h-11 rounded-xl bg-white dark:bg-zinc-900 dark:text-zinc-100"
            />
            <DatePicker
              label="Data de Fim"
              value={dataFim}
              max={today}
              onChange={onDataFimChange}
              className="min-w-0 w-full"
              inputClassName="h-11 rounded-xl bg-white dark:bg-zinc-900 dark:text-zinc-100"
            />
            <div className="rounded-xl border border-stone-200/60 bg-white/80 px-3.5 py-2.5 text-xs leading-5 text-stone-600 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-400 sm:col-span-2 lg:col-span-1">
              <span className="font-semibold text-stone-800 dark:text-zinc-200">Janela configurada:</span> intervalo
              máximo permitido de até 30 dias pelo CNJ.
            </div>
          </div>
        </div>

        {/* Lista de OABs Monitoradas */}
        {loadError ? null : monitoramentos.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-stone-50/50 px-6 py-10 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/10 text-gold-dark dark:bg-gold/15 dark:text-[#E5C158]">
              <BellRing className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="mt-3 text-sm font-bold text-stone-800 dark:text-zinc-200">
              Nenhuma OAB cadastrada no monitoramento
            </p>
            <p className="mt-1 text-xs text-stone-500 dark:text-zinc-400">
              Adicione a primeira OAB no formulário acima para sincronizar publicações judiciais.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-zinc-400">
              OABs Cadastradas ({monitoramentos.length})
            </h3>
            <div className="grid gap-3">
              {monitoramentos.map((monitoramento, index) => {
                const isSyncing = syncingMonitorId === monitoramento.id;
                const isUpdating = updatingMonitorId === monitoramento.id;
                const isBusy = Boolean(syncingMonitorId || updatingMonitorId || deletingMonitorId);

                return (
                  <motion.article
                    key={monitoramento.id}
                    initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: reduceMotion ? 0 : 0.2,
                      delay: reduceMotion ? 0 : index * 0.04,
                      ease: "easeOut",
                    }}
                    className="flex flex-col gap-4 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm transition hover:border-gold/30 dark:border-zinc-800/80 dark:bg-[#101213] dark:hover:border-gold/30 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono text-base font-bold text-stone-900 dark:text-zinc-100">
                          OAB {monitoramento.numero_oab}/{monitoramento.uf_oab}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            monitoramento.ativo
                              ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                              : "border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                          }`}
                        >
                          {monitoramento.ativo ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                              Ativa
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3" aria-hidden="true" />
                              Pausada
                            </>
                          )}
                        </span>
                      </div>
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-stone-500 dark:text-zinc-400">
                        <Clock className="h-3.5 w-3.5 text-stone-400 dark:text-zinc-500" aria-hidden="true" />
                        Última consulta concluída:{" "}
                        <strong className="font-medium text-stone-700 dark:text-zinc-300">
                          {formatDateTime(monitoramento.ultima_sincronizacao_em)}
                        </strong>
                      </p>
                    </div>

                    {(podeEditar || podeExcluir) && (
                      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                        {podeEditar && (
                          <>
                            <button
                              type="button"
                              onClick={() => onSetMonitorActive(monitoramento, !monitoramento.ativo)}
                              disabled={isBusy}
                              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 sm:flex-initial"
                            >
                              {isUpdating ? (
                                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                              ) : monitoramento.ativo ? (
                                <Pause className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                              ) : (
                                <Play className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                              )}
                              {monitoramento.ativo ? "Pausar" : "Reativar"}
                            </button>

                            <button
                              type="button"
                              onClick={() => onSynchronize(monitoramento)}
                              disabled={!monitoramento.ativo || isBusy}
                              className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-xl bg-gold px-3.5 text-xs font-bold text-[#17191A] shadow-sm transition hover:bg-gold-hover hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/25 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-initial"
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
                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            Excluir
                          </button>
                        )}
                      </div>
                    )}
                  </motion.article>
                );
              })}
            </div>
          </div>
        )}

        {message && (
          <div
            className={`mt-5 rounded-xl border px-4 py-3 text-xs leading-relaxed ${
              message.kind === "success"
                ? "border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                : "border-rose-200 bg-rose-50/80 text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
            }`}
            role={message.kind === "error" ? "alert" : "status"}
            aria-live={message.kind === "error" ? "assertive" : "polite"}
          >
            {message.text}
          </div>
        )}
      </section>

      {/* Dialog Seguro de Exclusão Onyx & Gold */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deletingMonitorId) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="dashboard-root max-w-md gap-5 rounded-2xl border border-stone-200 bg-white p-6 text-stone-800 shadow-2xl dark:border-zinc-800 dark:bg-[#17191A] dark:text-zinc-100"
        >
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-stone-900 dark:text-zinc-100">
              Excluir OAB do monitoramento?
            </DialogTitle>
            <DialogDescription className="mt-2 text-xs leading-5 text-stone-500 dark:text-zinc-400">
              {deleteTarget && (
                <>
                  A OAB{" "}
                  <strong className="font-mono text-stone-800 dark:text-zinc-200">
                    {deleteTarget.numero_oab}/{deleteTarget.uf_oab}
                  </strong>{" "}
                  será desvinculada do monitoramento contínuo. As publicações já salvas permanecerão preservadas em seu acervo.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <p
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
            >
              {deleteError}
            </p>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteError(null);
              }}
              disabled={Boolean(deletingMonitorId)}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-stone-200 bg-white px-4 text-xs font-semibold text-stone-700 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmDeleteMonitor}
              disabled={!deleteTarget || Boolean(deletingMonitorId)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-xs font-bold text-white transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deletingMonitorId ? (
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              )}
              {deletingMonitorId ? "Excluindo…" : "Confirmar Exclusão"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
