import type { FormEvent } from "react";
import {
  BellRing,
  CalendarDays,
  LoaderCircle,
  Pause,
  Play,
  Plus,
  RefreshCw,
} from "lucide-react";
import { BRAZILIAN_UFS } from "@/lib/djen/validation";
import { DatePicker } from "@/components/ui/date-picker";
import type { Message, Monitoramento } from "./types";

interface DjenMonitoringSectionProps {
  monitoramentos: Monitoramento[];
  podeEditar: boolean;
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
  message: Message | null;
  loadError: string | null;
  onAddMonitor: (event: FormEvent<HTMLFormElement>) => void;
  onSynchronize: (monitoramento: Monitoramento) => void;
  onSetMonitorActive: (monitoramento: Monitoramento, ativo: boolean) => void;
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
  message,
  loadError,
  onAddMonitor,
  onSynchronize,
  onSetMonitorActive,
}: DjenMonitoringSectionProps) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-amber-50 p-2.5 text-amber-700">
          <BellRing className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Monitoramento por OAB</h2>
          <p className="mt-1 max-w-3xl text-sm text-gray-500">
            Consulte manualmente as comunicações públicas do Diário de Justiça Eletrônico Nacional.
            Cada OAB é consultada separadamente; as publicações repetidas ficam salvas uma só vez e
            mantêm o vínculo com todas as OABs que as localizaram.
          </p>
        </div>
      </div>

      {loadError && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
          {loadError}
        </div>
      )}

      {podeEditar && (
        <form onSubmit={onAddMonitor} className="mt-5 grid gap-3 border-t border-gray-100 pt-5 sm:grid-cols-[minmax(0,1fr)_9rem_auto]">
          <label className="text-xs font-medium text-gray-600">
            Número da OAB
            <input
              value={numeroOab}
              onChange={(event) => onNumeroOabChange(event.target.value)}
              maxLength={40}
              required
              autoComplete="off"
              placeholder="Ex.: 123456A ou 12.345/2020"
              className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            />
          </label>
          <label className="text-xs font-medium text-gray-600">
            Seccional
            <select
              value={ufOab}
              onChange={(event) => onUfOabChange(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            >
              {BRAZILIAN_UFS.map((uf) => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={saving || !numeroOab.trim()}
            className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-lg bg-gray-900 px-4 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Adicionar OAB
          </button>
        </form>
      )}

      <div className="mt-5 flex flex-col gap-3 rounded-xl bg-gray-50 p-4 sm:flex-row sm:items-end">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 sm:mr-auto">
          <CalendarDays className="h-4 w-4 text-gray-400" aria-hidden="true" />
          Período da consulta
        </div>
        <DatePicker label="De" value={dataInicio} max={today} onChange={onDataInicioChange} className="w-full sm:w-auto sm:min-w-[10rem]" inputClassName="h-10 rounded-lg text-xs" />
        <DatePicker label="Até" value={dataFim} max={today} onChange={onDataFimChange} className="w-full sm:w-auto sm:min-w-[10rem]" inputClassName="h-10 rounded-lg text-xs" />
        <p className="basis-full text-xs text-gray-400 sm:basis-auto sm:self-end">
          Padrão: últimos 7 dias. Máximo: 30 dias.
        </p>
      </div>

      {loadError ? null : monitoramentos.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-gray-200 px-5 py-8 text-center">
          <p className="text-sm font-medium text-gray-700">Nenhuma OAB cadastrada</p>
          <p className="mt-1 text-sm text-gray-400">Adicione uma seccional para começar a consultar publicações.</p>
        </div>
      ) : (
        <div className="mt-5 grid gap-3">
          {monitoramentos.map((monitoramento) => {
            const isSyncing = syncingMonitorId === monitoramento.id;
            const isUpdating = updatingMonitorId === monitoramento.id;
            return (
              <div key={monitoramento.id} className="flex flex-col gap-3 rounded-xl border border-gray-100 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-gray-900">
                      OAB {monitoramento.numero_oab}/{monitoramento.uf_oab}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      monitoramento.ativo
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      {monitoramento.ativo ? "Ativa" : "Pausada"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    Última consulta concluída: {formatDateTime(monitoramento.ultima_sincronizacao_em)}
                  </p>
                </div>

                {podeEditar && (
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSetMonitorActive(monitoramento, !monitoramento.ativo)}
                      disabled={isUpdating || Boolean(updatingMonitorId)}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
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
                      disabled={!monitoramento.ativo || Boolean(syncingMonitorId) || Boolean(updatingMonitorId)}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-amber-600 px-3 text-xs font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                      {isSyncing ? "Consultando…" : "Consultar DJEN"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {message && (
        <div
          className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
            message.kind === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
          role="status"
          aria-live="polite"
        >
          {message.text}
        </div>
      )}
    </section>
  );
}
