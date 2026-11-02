"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  Calendar,
  ChevronDown,
  FileSearch,
  ExternalLink,
  Link2,
  LoaderCircle,
  Search,
  User,
  Users,
} from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { normalizeCnjNumber, validateDateRange } from "@/lib/djen/validation";

type DjenClient = {
  id: string;
  nome: string;
  tipo: "pf" | "pj";
  documentoMascarado: string | null;
};

type ClientProcess = { id: string; numero_cnj: string | null };

type CandidateCommunication = {
  hash: string;
  nomeParte?: string | null;
  data_disponibilizacao?: string | null;
  siglaTribunal?: string | null;
  tipoComunicacao?: string | null;
  nomeOrgao?: string | null;
  texto?: string | null;
  numero_processo?: string | null;
  numeroprocessocommascara?: string | null;
  link?: string | null;
  tipoDocumento?: string | null;
  nomeClasse?: string | null;
  destinatarios?: Array<{ nome?: string | null; polo?: string | null }> | null;
};

type Candidate = {
  token: string | null;
  associacaoDisponivel: boolean;
  comunicacao: CandidateCommunication;
  associadaAoProcesso?: string;
};

type UiMessage = { kind: "success" | "error"; text: string };

interface DjenClientSearchSectionProps {
  today: string;
  defaultStartDate: string;
  podePesquisar: boolean;
  podeLerProcessos: boolean;
  podeAssociarProcesso: boolean;
}

async function readResponse(response: Response) {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Data não informada";
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString("pt-BR", { timeZone: "UTC", dateStyle: "medium" })
    : "Data não informada";
}

function calculatePresetStartDate(todayStr: string, days: number): string {
  const d = new Date(`${todayStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - (days - 1));
  return d.toISOString().slice(0, 10);
}

function getMatchingProcesses(processes: ClientProcess[], communication: CandidateCommunication) {
  const number = normalizeCnjNumber(communication.numero_processo);
  if (!number) return [];
  return processes.filter((process) => normalizeCnjNumber(process.numero_cnj) === number);
}

export function DjenClientSearchSection({
  today,
  defaultStartDate,
  podePesquisar,
  podeLerProcessos,
  podeAssociarProcesso,
}: DjenClientSearchSectionProps) {
  const router = useRouter();
  const reduceMotion = useReducedMotion() ?? false;

  const [clientes, setClientes] = useState<DjenClient[]>([]);
  const [clientesLoading, setClientesLoading] = useState(false);
  const [clientesLoadingMore, setClientesLoadingMore] = useState(false);
  const [clientesProximoOffset, setClientesProximoOffset] = useState<number | null>(null);
  const [clienteId, setClienteId] = useState("");
  const [dataInicio, setDataInicio] = useState(defaultStartDate);
  const [dataFim, setDataFim] = useState(today);
  const [processos, setProcessos] = useState<ClientProcess[]>([]);
  const [processosLoading, setProcessosLoading] = useState(false);
  const [processosLoadingMore, setProcessosLoadingMore] = useState(false);
  const [processosProximoOffset, setProcessosProximoOffset] = useState<number | null>(null);
  const [processosError, setProcessosError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [expandedHashes, setExpandedHashes] = useState<Set<string>>(() => new Set());
  const [selectedProcessByHash, setSelectedProcessByHash] = useState<Record<string, string>>({});
  const [searching, setSearching] = useState(false);
  const [associatingHash, setAssociatingHash] = useState<string | null>(null);
  const [message, setMessage] = useState<UiMessage | null>(null);
  const [resultsMeta, setResultsMeta] = useState<{
    uniqueCount: number;
    totalCount: number;
    candidateCount: number;
    truncated: boolean;
  } | null>(null);

  const selectedClient = useMemo(
    () => clientes.find((cliente) => cliente.id === clienteId) ?? null,
    [clientes, clienteId]
  );

  function applyPreset(days: number) {
    const start = calculatePresetStartDate(today, days);
    setDataInicio(start);
    setDataFim(today);
  }

  function isPresetActive(days: number): boolean {
    const start = calculatePresetStartDate(today, days);
    return dataInicio === start && dataFim === today;
  }

  function toggleExpanded(hash: string) {
    setExpandedHashes((current) => {
      const next = new Set(current);
      if (next.has(hash)) next.delete(hash);
      else next.add(hash);
      return next;
    });
  }

  useEffect(() => {
    if (!podePesquisar) return;

    let cancelled = false;
    setClientesLoading(true);
    fetch("/api/djen/clientes?offset=0", { cache: "no-store" })
      .then(readResponse)
      .then((payload) => {
        if (cancelled) return;
        if (!Array.isArray(payload.clientes)) {
          throw new Error(
            typeof payload.error === "string" ? payload.error : "Não foi possível carregar os clientes."
          );
        }
        setClientes(payload.clientes as DjenClient[]);
        setClientesProximoOffset(typeof payload.proximoOffset === "number" ? payload.proximoOffset : null);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage({
            kind: "error",
            text: error instanceof Error ? error.message : "Não foi possível carregar os clientes.",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setClientesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [podePesquisar]);

  async function loadMoreClients() {
    if (clientesProximoOffset === null || clientesLoadingMore) return;
    setClientesLoadingMore(true);
    try {
      const response = await fetch(`/api/djen/clientes?offset=${clientesProximoOffset}`, { cache: "no-store" });
      const payload = await readResponse(response);
      if (!response.ok || !Array.isArray(payload.clientes)) {
        throw new Error(
          typeof payload.error === "string" ? payload.error : "Não foi possível carregar mais clientes."
        );
      }
      setClientes((current) => [...current, ...(payload.clientes as DjenClient[])]);
      setClientesProximoOffset(typeof payload.proximoOffset === "number" ? payload.proximoOffset : null);
    } catch (error: unknown) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Não foi possível carregar mais clientes.",
      });
    } finally {
      setClientesLoadingMore(false);
    }
  }

  useEffect(() => {
    setCandidates([]);
    setSelectedProcessByHash({});
    setResultsMeta(null);
    setMessage(null);
    setProcessos([]);
    setProcessosProximoOffset(null);
    setProcessosError(null);
    if (!clienteId || !podeLerProcessos) return;

    let cancelled = false;
    setProcessosLoading(true);
    const params = new URLSearchParams({ clienteId, offset: "0" });
    fetch(`/api/djen/clientes/processos?${params.toString()}`, { cache: "no-store" })
      .then(readResponse)
      .then((payload) => {
        if (cancelled) return;
        if (!Array.isArray(payload.processos)) {
          throw new Error(
            typeof payload.error === "string" ? payload.error : "Não foi possível carregar os processos."
          );
        }
        setProcessos(payload.processos as ClientProcess[]);
        setProcessosProximoOffset(typeof payload.proximoOffset === "number" ? payload.proximoOffset : null);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setProcessosError(error instanceof Error ? error.message : "Não foi possível carregar os processos.");
        }
      })
      .finally(() => {
        if (!cancelled) setProcessosLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clienteId, podeLerProcessos]);

  async function loadMoreProcesses() {
    if (!clienteId || processosProximoOffset === null || processosLoadingMore) return;
    setProcessosLoadingMore(true);
    setProcessosError(null);
    try {
      const params = new URLSearchParams({ clienteId, offset: String(processosProximoOffset) });
      const response = await fetch(`/api/djen/clientes/processos?${params.toString()}`, { cache: "no-store" });
      const payload = await readResponse(response);
      if (!response.ok || !Array.isArray(payload.processos)) {
        throw new Error(
          typeof payload.error === "string" ? payload.error : "Não foi possível carregar mais processos."
        );
      }
      setProcessos((current) => [...current, ...(payload.processos as ClientProcess[])]);
      setProcessosProximoOffset(typeof payload.proximoOffset === "number" ? payload.proximoOffset : null);
    } catch (error: unknown) {
      setProcessosError(error instanceof Error ? error.message : "Não foi possível carregar mais processos.");
    } finally {
      setProcessosLoadingMore(false);
    }
  }

  async function searchByClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!podePesquisar || !clienteId || searching) return;

    const rangeError = validateDateRange(dataInicio, dataFim, today);
    if (rangeError) {
      setMessage({ kind: "error", text: rangeError });
      return;
    }

    setSearching(true);
    setMessage(null);
    setCandidates([]);
    setResultsMeta(null);
    setSelectedProcessByHash({});

    try {
      const response = await fetch("/api/djen/clientes/buscar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // A requisição envia apenas o ID interno e as datas; nunca CPF/CNPJ ou nome livre.
        body: JSON.stringify({ clienteId, dataInicio, dataFim }),
      });
      const payload = await readResponse(response);
      if (!response.ok) {
        setMessage({
          kind: "error",
          text: typeof payload.error === "string" ? payload.error : "Não foi possível consultar o DJEN.",
        });
        return;
      }

      const nextCandidates = Array.isArray(payload.candidates) ? (payload.candidates as Candidate[]) : [];
      setCandidates(nextCandidates);
      const uniqueCount = typeof payload.uniqueCount === "number" ? payload.uniqueCount : nextCandidates.length;
      const totalCount = typeof payload.totalCount === "number" ? payload.totalCount : uniqueCount;
      setResultsMeta({
        uniqueCount,
        totalCount,
        candidateCount: typeof payload.candidateCount === "number" ? payload.candidateCount : nextCandidates.length,
        truncated: payload.truncated === true,
      });
      setMessage({
        kind: "success",
        text:
          payload.semResultados === true
            ? "Consulta concluída. O DJEN não retornou publicações para o período escolhido."
            : `Consulta concluída: ${uniqueCount} resultado(s) único(s) candidato(s) por nome${
                payload.truncated === true ? `; exibindo os primeiros ${nextCandidates.length}` : ""
              }.`,
      });
    } catch {
      setMessage({ kind: "error", text: "Não foi possível consultar o DJEN. Tente novamente." });
    } finally {
      setSearching(false);
    }
  }

  async function associateCandidate(candidate: Candidate) {
    if (!podeAssociarProcesso || !candidate.token || associatingHash) return;
    const processoId = selectedProcessByHash[candidate.comunicacao.hash];
    if (!processoId) {
      setMessage({ kind: "error", text: "Selecione manualmente o processo existente antes de associar." });
      return;
    }

    setAssociatingHash(candidate.comunicacao.hash);
    setMessage(null);
    try {
      const response = await fetch("/api/djen/clientes/associar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ candidateToken: candidate.token, processoId }),
      });
      const payload = await readResponse(response);
      if (!response.ok) {
        setMessage({
          kind: "error",
          text: typeof payload.error === "string" ? payload.error : "Não foi possível associar a publicação.",
        });
        return;
      }

      const numeroProcesso =
        typeof payload.numeroProcesso === "string" ? payload.numeroProcesso : "processo selecionado";
      setCandidates((current) =>
        current.map((item) =>
          item.comunicacao.hash === candidate.comunicacao.hash
            ? { ...item, associadaAoProcesso: numeroProcesso }
            : item
        )
      );
      setMessage({
        kind: "success",
        text: `Publicação associada manualmente a ${numeroProcesso}. Nenhum processo ou prazo foi criado automaticamente.`,
      });
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: "Não foi possível concluir a associação manual." });
    } finally {
      setAssociatingHash(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Formulário Principal de Busca por Cliente */}
      <section className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm dark:border-zinc-800/80 dark:bg-[#17191A] sm:p-6">
        <div className="flex items-start gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gold/10 text-gold-dark dark:bg-gold/15 dark:text-[#E5C158]">
            <FileSearch className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-bold text-stone-900 dark:text-zinc-100 sm:text-lg">
              Pesquisa de Publicações por Nome do Cliente
            </h2>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-stone-500 dark:text-zinc-400">
              Localize intimações públicas correspondentes ao nome de partes cadastradas no sistema.
              A API do DJEN realiza a correspondência fonética e textual pelo nome; o documento do cliente não é transmitido.
            </p>
          </div>
        </div>

        {/* Alerta de Conformidade e Responsabilidade */}
        <div
          className="mt-5 flex gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4 text-xs leading-relaxed text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
          role="note"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          <p>
            Resultados retornados são <strong>candidatos preliminares</strong> por homonímia. É imprescindível revisar o
            número dos autos, vara e teor antes de associar a um processo cadastrado.
          </p>
        </div>

        {!podePesquisar ? (
          <div className="mt-5 rounded-xl border border-stone-200 bg-stone-50 p-4 text-xs text-stone-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            Seu perfil não possui permissão para consultar o DJEN por cliente.
          </div>
        ) : (
          <form onSubmit={searchByClient} className="mt-6 space-y-4 border-t border-stone-100 pt-5 dark:border-zinc-800/80">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Seletor de Cliente com Documento Mascarado */}
              <div>
                <label htmlFor="djen-cliente-select" className="block text-xs font-semibold text-stone-700 dark:text-zinc-300">
                  Cliente Cadastrado
                </label>
                <div className="mt-1.5 relative">
                  <select
                    id="djen-cliente-select"
                    value={clienteId}
                    onChange={(event) => setClienteId(event.target.value)}
                    disabled={clientesLoading || processosLoadingMore || searching}
                    required
                    className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3.5 text-sm font-medium text-stone-900 outline-none transition hover:border-stone-300 focus:border-gold focus:ring-4 focus:ring-gold/15 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600"
                  >
                    <option value="">
                      {clientesLoading ? "Carregando catálogo de clientes…" : "Selecione o cliente cadastrado"}
                    </option>
                    {clientes.map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nome} {cliente.documentoMascarado ? `(${cliente.documentoMascarado})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status e Carregar Mais Clientes */}
                <div className="mt-1.5 flex flex-wrap items-center justify-between text-[11px] text-stone-500 dark:text-zinc-400">
                  <span>
                    {clientes.length > 0 ? `${clientes.length} cliente(s) carregados` : "Nenhum cliente disponível"}
                  </span>
                  {clientesProximoOffset !== null && (
                    <button
                      type="button"
                      onClick={loadMoreClients}
                      disabled={clientesLoadingMore || searching}
                      className="font-semibold text-gold-dark hover:text-gold disabled:opacity-50 dark:text-[#E5C158]"
                    >
                      {clientesLoadingMore ? "Carregando mais…" : "+ Carregar mais clientes"}
                    </button>
                  )}
                </div>

                {/* Preview do Cliente Selecionado */}
                {selectedClient && (
                  <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-stone-200/70 bg-stone-50/80 px-3.5 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/60">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold/15 text-gold-dark dark:text-[#E5C158]">
                      {selectedClient.tipo === "pj" ? (
                        <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <User className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-stone-900 dark:text-zinc-100">
                        {selectedClient.nome}
                      </p>
                      <p className="font-mono text-[11px] text-stone-500 dark:text-zinc-400">
                        {selectedClient.documentoMascarado ?? "Sem documento informado"} ·{" "}
                        <span className="uppercase">{selectedClient.tipo}</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Intervalo de Datas com Presets Rápidos */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-stone-700 dark:text-zinc-300">
                    Período da Consulta
                  </label>
                  {/* Presets de Data Rápidos */}
                  <div className="flex items-center gap-1.5">
                    {[
                      { label: "7 dias", days: 7 },
                      { label: "15 dias", days: 15 },
                      { label: "30 dias", days: 30 },
                    ].map((preset) => {
                      const active = isPresetActive(preset.days);
                      return (
                        <button
                          key={preset.days}
                          type="button"
                          onClick={() => applyPreset(preset.days)}
                          className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold transition ${
                            active
                              ? "bg-gold text-[#17191A] shadow-sm"
                              : "border border-stone-200 bg-white text-stone-600 hover:border-gold/40 hover:bg-stone-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-1.5 grid grid-cols-2 gap-3">
                  <DatePicker
                    label="Data Inicial"
                    value={dataInicio}
                    max={today}
                    onChange={setDataInicio}
                    className="w-full"
                    inputClassName="h-11 rounded-xl bg-white dark:bg-zinc-900 dark:text-zinc-100"
                  />
                  <DatePicker
                    label="Data Final"
                    value={dataFim}
                    max={today}
                    onChange={setDataFim}
                    className="w-full"
                    inputClassName="h-11 rounded-xl bg-white dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <p className="mt-2 text-[11px] leading-4 text-stone-400 dark:text-zinc-500">
                  Máximo de 30 dias por requisição imposto pelo CNJ.
                </p>
              </div>
            </div>

            {/* Botão de Submissão */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={searching || clientesLoading || clientesLoadingMore || !clienteId}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gold px-6 text-xs font-bold text-[#17191A] shadow-sm transition hover:bg-gold-hover hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {searching ? (
                  <LoaderCircle className="h-4 w-4 animate-spin text-[#17191A]" aria-hidden="true" />
                ) : (
                  <Search className="h-4 w-4 text-[#17191A]" aria-hidden="true" />
                )}
                {searching ? "Consultando DJEN…" : "Pesquisar Candidatos no DJEN"}
              </button>
            </div>
          </form>
        )}

        {/* Notificações e Mensagens da Consulta */}
        {message && (
          <div
            className={`mt-5 rounded-xl border px-4 py-3 text-xs leading-relaxed ${
              message.kind === "success"
                ? "border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                : "border-rose-200 bg-rose-50/80 text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
            }`}
            role="status"
            aria-live="polite"
          >
            {message.text}
          </div>
        )}

        {/* Processos existentes do cliente para vínculo */}
        {selectedClient && podeLerProcessos && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3 text-xs text-stone-500 dark:border-zinc-800/80 dark:text-zinc-400">
            <span>
              {processosLoading
                ? "Carregando processos cadastrados do cliente…"
                : processosError
                ? processosError
                : `${processos.length} processo(s) existente(s) vinculados a este cliente.`}
            </span>
            {processosProximoOffset !== null && (
              <button
                type="button"
                onClick={loadMoreProcesses}
                disabled={processosLoadingMore || processosLoading}
                className="font-semibold text-gold-dark hover:text-gold disabled:opacity-50 dark:text-[#E5C158]"
              >
                {processosLoadingMore ? "Carregando…" : "+ Carregar mais processos"}
              </button>
            )}
          </div>
        )}
      </section>

      {/* Resultados e Candidatos Retornados */}
      {resultsMeta && candidates.length > 0 && (
        <section className="space-y-4" aria-labelledby="candidatos-encontrados-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 id="candidatos-encontrados-heading" className="text-base font-bold text-stone-900 dark:text-zinc-100">
                Publicações Candidatas para {selectedClient?.nome}
              </h3>
              <p className="mt-0.5 text-xs text-stone-500 dark:text-zinc-400">
                {resultsMeta.uniqueCount} publicação(ões) única(s) localizada(s). Resultados temporários para conferência e associação.
              </p>
            </div>
            {resultsMeta.truncated && (
              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                Exibindo os primeiros {candidates.length}
              </span>
            )}
          </div>

          <div className="space-y-3.5">
            {candidates.map((candidate) => {
              const item = candidate.comunicacao;
              const matchingProcesses = getMatchingProcesses(processos, item);
              const caseNumber = item.numeroprocessocommascara ?? item.numero_processo ?? "Processo não informado";
              const isAssociated = Boolean(candidate.associadaAoProcesso);
              const isExpanded = expandedHashes.has(item.hash);

              return (
                <motion.article
                  key={item.hash}
                  initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  whileHover={reduceMotion ? undefined : { y: -2 }}
                  viewport={{ once: true, margin: "-20px" }}
                  transition={{ duration: reduceMotion ? 0 : 0.25, ease: "easeOut" }}
                  className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm transition hover:border-gold/30 hover:shadow-md dark:border-zinc-800/80 dark:bg-[#17191A] dark:hover:border-gold/30 sm:p-6"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-gold/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-dark dark:bg-gold/15 dark:text-[#E5C158]">
                          Candidato por nome
                        </span>
                        {item.siglaTribunal && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-stone-200/70 bg-stone-50 px-2 py-0.5 text-[10px] font-semibold text-stone-600 dark:border-zinc-700/80 dark:bg-zinc-800/80 dark:text-zinc-300">
                            <Building2 className="h-3 w-3" aria-hidden="true" />
                            {item.siglaTribunal}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-xs text-stone-500 dark:text-zinc-400">
                          <Calendar className="h-3 w-3" aria-hidden="true" />
                          Disponibilizada em {formatDate(item.data_disponibilizacao)}
                        </span>
                      </div>

                      <p className="mt-2.5 text-sm font-bold text-stone-900 dark:text-zinc-100">
                        Nome da parte no diário:{" "}
                        <span className="font-semibold text-gold-dark dark:text-[#E5C158]">
                          {item.nomeParte ?? "Não informado pelo DJEN"}
                        </span>
                      </p>

                      <p className="mt-1 break-all font-mono text-sm font-bold text-stone-800 dark:text-zinc-200">
                        {caseNumber}
                      </p>

                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500 dark:text-zinc-400">
                        {item.nomeOrgao && <span><strong>Órgão:</strong> {item.nomeOrgao}</span>}
                        {item.nomeClasse && <span><strong>Classe:</strong> {item.nomeClasse}</span>}
                      </div>

                      {item.destinatarios && item.destinatarios.length > 0 && (
                        <div className="mt-2 flex items-start gap-1.5 text-xs text-stone-600 dark:text-zinc-400">
                          <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400 dark:text-zinc-500" aria-hidden="true" />
                          <p className="leading-5">
                            <strong>Destinatários:</strong>{" "}
                            {item.destinatarios.map((destinatario) => destinatario.nome).filter(Boolean).join(", ") ||
                              "não informados"}
                          </p>
                        </div>
                      )}
                    </div>

                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-sm transition hover:border-gold hover:text-gold-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:border-gold dark:hover:text-[#E5C158]"
                      >
                        Abrir no tribunal
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    )}
                  </div>

                  {/* Teor expansível animado com Framer Motion */}
                  {item.texto && (
                    <div className="mt-3.5 border-t border-stone-100 pt-3 dark:border-zinc-800/80">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(item.hash)}
                        aria-expanded={isExpanded}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 transition hover:text-gold-dark dark:text-zinc-400 dark:hover:text-[#E5C158]"
                      >
                        <span>{isExpanded ? "Ocultar teor da publicação" : "Revisar teor completo da publicação"}</span>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-180 text-gold" : ""}`}
                          aria-hidden="true"
                        />
                      </button>

                      <motion.div
                        initial={false}
                        animate={isExpanded ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
                        transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2.5 rounded-xl border border-stone-200/80 bg-stone-50/70 p-4 font-mono text-xs leading-relaxed text-stone-800 dark:border-zinc-800/80 dark:bg-[#101213] dark:text-zinc-200">
                          <p className="whitespace-pre-wrap select-text">{item.texto}</p>
                        </div>
                      </motion.div>
                    </div>
                  )}

                  {/* Caixa de Associação Manual com Processo */}
                  {isAssociated ? (
                    <div
                      className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-semibold text-emerald-800 dark:text-emerald-300"
                      role="status"
                    >
                      <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                      Associação manual registrada no processo {candidate.associadaAoProcesso}.
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl border border-stone-200/80 bg-stone-50/60 p-4 dark:border-zinc-800/80 dark:bg-[#101213]">
                      {podeAssociarProcesso && podeLerProcessos ? (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                          <label className="min-w-0 flex-1 text-xs font-semibold text-stone-700 dark:text-zinc-300">
                            Associar a Processo Existente do Cliente
                            <select
                              value={selectedProcessByHash[item.hash] ?? ""}
                              onChange={(event) =>
                                setSelectedProcessByHash((current) => ({
                                  ...current,
                                  [item.hash]: event.target.value,
                                }))
                              }
                              disabled={processosLoading || associatingHash === item.hash}
                              className="mt-1.5 h-10 block w-full rounded-xl border border-stone-200 bg-white px-3 text-xs outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/15 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                            >
                              <option value="">Selecione o processo correspondente…</option>
                              {matchingProcesses.map((processo) => (
                                <option key={processo.id} value={processo.id}>
                                  {processo.numero_cnj} (Mesmo CNJ)
                                </option>
                              ))}
                              {processos
                                .filter((p) => !matchingProcesses.some((m) => m.id === p.id))
                                .map((processo) => (
                                  <option key={processo.id} value={processo.id}>
                                    {processo.numero_cnj}
                                  </option>
                                ))}
                            </select>
                          </label>

                          <button
                            type="button"
                            onClick={() => associateCandidate(candidate)}
                            disabled={
                              !candidate.associacaoDisponivel ||
                              !selectedProcessByHash[item.hash] ||
                              Boolean(associatingHash) ||
                              processosLoading
                            }
                            className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gold px-4 text-xs font-bold text-[#17191A] shadow-sm transition hover:bg-gold-hover hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/25 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {associatingHash === item.hash ? (
                              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Link2 className="h-3.5 w-3.5" />
                            )}
                            {associatingHash === item.hash ? "Associando…" : "Associar ao Processo"}
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-stone-600 dark:text-zinc-400">
                          {podeLerProcessos
                            ? "Seu perfil não possui autorização para vincular publicações a processos."
                            : "A associação exige permissão de acesso a processos."}
                        </p>
                      )}

                      {matchingProcesses.length === 0 && (
                        <p className="mt-2 text-[11px] leading-4 text-stone-500 dark:text-zinc-400">
                          Nota: Nenhum processo deste cliente possui o mesmo CNJ desta publicação. Você pode selecionar outro processo do cliente acima ou cadastrá-lo previamente.
                        </p>
                      )}
                    </div>
                  )}
                </motion.article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
