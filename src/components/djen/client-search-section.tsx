"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, BadgeCheck, FileSearch, LoaderCircle, Link2, Search } from "lucide-react";
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

  useEffect(() => {
    if (!podePesquisar) return;

    let cancelled = false;
    setClientesLoading(true);
    fetch("/api/djen/clientes?offset=0", { cache: "no-store" })
      .then(readResponse)
      .then((payload) => {
        if (cancelled) return;
        if (!Array.isArray(payload.clientes)) {
          throw new Error(typeof payload.error === "string" ? payload.error : "Não foi possível carregar os clientes.");
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

    return () => { cancelled = true; };
  }, [podePesquisar]);

  async function loadMoreClients() {
    if (clientesProximoOffset === null || clientesLoadingMore) return;
    setClientesLoadingMore(true);
    try {
      const response = await fetch(`/api/djen/clientes?offset=${clientesProximoOffset}`, { cache: "no-store" });
      const payload = await readResponse(response);
      if (!response.ok || !Array.isArray(payload.clientes)) {
        throw new Error(typeof payload.error === "string" ? payload.error : "Não foi possível carregar mais clientes.");
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
          throw new Error(typeof payload.error === "string" ? payload.error : "Não foi possível carregar os processos.");
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

    return () => { cancelled = true; };
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
        throw new Error(typeof payload.error === "string" ? payload.error : "Não foi possível carregar mais processos.");
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

      const nextCandidates = Array.isArray(payload.candidates) ? payload.candidates as Candidate[] : [];
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
        text: payload.semResultados === true
          ? "Consulta concluída. O DJEN não retornou publicações para o período escolhido."
          : `Consulta concluída: ${uniqueCount} resultado(s) único(s) candidato(s) por nome${payload.truncated === true ? `; exibindo os primeiros ${nextCandidates.length}` : ""}.`,
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

      const numeroProcesso = typeof payload.numeroProcesso === "string" ? payload.numeroProcesso : "processo selecionado";
      setCandidates((current) => current.map((item) => item.comunicacao.hash === candidate.comunicacao.hash
        ? { ...item, associadaAoProcesso: numeroProcesso }
        : item));
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
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-gold-soft p-2.5 text-gold-dark dark:bg-[#D4AF37]/15 dark:text-[#E5C158]">
          <FileSearch className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Busca de publicações por cliente</h2>
          <p className="mt-1 max-w-3xl text-sm text-gray-500 dark:text-zinc-400">
            Selecione um cliente cadastrado. A consulta externa usa somente o nome da parte e o período; CPF/CNPJ é exibido mascarado apenas para distinguir o cadastro interno.
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200" role="note">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          Resultados por nome são candidatos e não comprovam a identidade do cliente. Revise o nome da parte, o número do processo e o teor. Nada será vinculado até uma associação manual a um processo já cadastrado.
        </p>
      </div>

      {!podePesquisar ? (
        <p className="mt-4 text-sm text-gray-500 dark:text-zinc-400">Seu perfil não tem permissão para consultar o DJEN por cliente.</p>
      ) : (
        <form onSubmit={searchByClient} className="mt-5 grid gap-3 border-t border-gray-100 pt-5 dark:border-zinc-800 lg:grid-cols-[minmax(0,1fr)_10rem_10rem_auto] lg:items-end">
          <div className="text-xs font-medium text-gray-600 dark:text-zinc-300">
            <label htmlFor="djen-cliente" className="block">Cliente cadastrado</label>
            <select
              id="djen-cliente"
              value={clienteId}
              onChange={(event) => setClienteId(event.target.value)}
              disabled={clientesLoading || processosLoadingMore || searching}
              required
              className="mt-1.5 block w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/10 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100"
            >
              <option value="">{clientesLoading ? "Carregando clientes…" : "Selecione um cliente"}</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nome}{cliente.documentoMascarado ? ` · ${cliente.documentoMascarado}` : ""}
                </option>
              ))}
            </select>
          {clientesProximoOffset !== null && (
            <button
              type="button"
              onClick={loadMoreClients}
              disabled={clientesLoadingMore || searching}
              className="mt-1 text-left text-xs font-medium text-gold-dark hover:text-gold disabled:opacity-50 dark:text-[#E5C158]"
            >
              {clientesLoadingMore ? "Carregando…" : `Carregar mais clientes (${clientes.length} carregados)`}
            </button>
          )}
          </div>
          <DatePicker label="De" value={dataInicio} max={today} onChange={setDataInicio} inputClassName="h-10 rounded-lg dark:bg-zinc-800/60 dark:text-zinc-100" />
          <DatePicker label="Até" value={dataFim} max={today} onChange={setDataFim} inputClassName="h-10 rounded-lg dark:bg-zinc-800/60 dark:text-zinc-100" />
          <button
            type="submit"
            disabled={searching || clientesLoading || clientesLoadingMore || !clienteId}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          >
            {searching ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {searching ? "Consultando…" : "Buscar no DJEN"}
          </button>
          <p className="text-xs text-gray-400 dark:text-zinc-500 lg:col-span-4">
            Período máximo de 30 dias. A consulta usa o nome do cadastro selecionado; o documento completo nunca é enviado ao CNJ.
          </p>
        </form>
      )}

      {message && (
        <div
          className={`mt-4 rounded-lg border px-4 py-3 text-sm ${message.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300" : "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"}`}
          role="status"
          aria-live="polite"
        >
          {message.text}
        </div>
      )}

      {selectedClient && podeLerProcessos && (
        <div className="mt-3 text-xs text-gray-400 dark:text-zinc-400" aria-live="polite">
          {processosLoading
            ? "Carregando processos já vinculados a este cliente…"
            : processosError
              ? processosError
              : `${processos.length} processo(s) existente(s) vinculados ao cliente carregados para revisão${processosProximoOffset !== null ? "; há mais opções, use “Carregar mais processos” abaixo" : ""}.`}
        </div>
      )}

      {selectedClient && processosProximoOffset !== null && podeLerProcessos && (
        <button
          type="button"
          onClick={loadMoreProcesses}
          disabled={processosLoadingMore || processosLoading}
          className="mt-2 text-xs font-medium text-gold-dark hover:text-gold disabled:opacity-50 dark:text-[#E5C158]"
        >
          {processosLoadingMore ? "Carregando…" : `Carregar mais processos (${processos.length} carregados)`}
        </button>
      )}

      {resultsMeta && candidates.length > 0 && (
        <div className="mt-5 border-t border-gray-100 pt-4 dark:border-zinc-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                Candidatos encontrados para {selectedClient?.nome ?? "o cliente selecionado"}
              </h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
                {resultsMeta.uniqueCount} publicação(ões) única(s) retornada(s); {resultsMeta.candidateCount} exibida(s){resultsMeta.totalCount !== resultsMeta.uniqueCount ? ` (${resultsMeta.totalCount} item(ns) bruto(s) informado(s) pelo CNJ antes de remover hashes repetidos)` : ""}{selectedClient ? ` na consulta de ${selectedClient.nome}` : ""}. Lista temporária, removida ao sair da tela.
              </p>
            </div>
            {resultsMeta.truncated && (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                Exibindo os primeiros {candidates.length}
              </span>
            )}
          </div>

          <div className="mt-3 space-y-3">
            {candidates.map((candidate) => {
              const item = candidate.comunicacao;
              const matchingProcesses = getMatchingProcesses(processos, item);
              const caseNumber = item.numeroprocessocommascara ?? item.numero_processo ?? "Processo não informado";
              const isAssociated = Boolean(candidate.associadaAoProcesso);

              return (
                <article key={item.hash} className="rounded-xl border border-gray-200 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-gold-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-gold-dark dark:bg-[#D4AF37]/15 dark:text-[#E5C158]">
                          Candidato por nome
                        </span>
                        <span className="text-xs text-gray-500 dark:text-zinc-400">Disponibilizada em {formatDate(item.data_disponibilizacao)}</span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-zinc-100">
                        Nome da parte: {item.nomeParte ?? "Não informado pelo DJEN"}
                      </p>
                      <p className="mt-1 break-all font-mono text-xs text-gray-600 dark:text-zinc-300">{caseNumber}</p>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-zinc-400">
                        {item.siglaTribunal && <span>{item.siglaTribunal}</span>}
                        {item.nomeOrgao && <span>{item.nomeOrgao}</span>}
                        {item.nomeClasse && <span>{item.nomeClasse}</span>}
                      </div>
                    </div>
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-gold-dark hover:text-gold dark:text-[#E5C158]"
                      >
                        Abrir no tribunal
                        <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    )}
                  </div>

                  {item.destinatarios && item.destinatarios.length > 0 && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-zinc-400">
                      Destinatários: {item.destinatarios.map((destinatario) => destinatario.nome).filter(Boolean).join(", ") || "não informados"}
                    </p>
                  )}

                  {item.texto && (
                    <details className="mt-3 rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-zinc-800/60">
                      <summary className="cursor-pointer text-xs font-medium text-gray-600 outline-none focus-visible:ring-2 focus-visible:ring-gold dark:text-zinc-300">
                        Revisar teor da publicação
                      </summary>
                      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-gray-700 dark:text-zinc-200">{item.texto}</p>
                    </details>
                  )}

                  {isAssociated ? (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300" role="status">
                      <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                      Associação manual registrada no processo {candidate.associadaAoProcesso}.
                    </div>
                  ) : (
                    <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50/70 p-3 dark:border-amber-500/25 dark:bg-amber-500/10">
                      {podeAssociarProcesso && podeLerProcessos ? (
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                          <label className="min-w-0 flex-1 text-xs font-medium text-gray-700 dark:text-zinc-200">
                            Processo existente do cliente
                            <select
                              value={selectedProcessByHash[item.hash] ?? ""}
                              onChange={(event) => setSelectedProcessByHash((current) => ({
                                ...current,
                                [item.hash]: event.target.value,
                              }))}
                              disabled={processosLoading || associatingHash === item.hash}
                              className="mt-1.5 block w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/10 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                            >
                              <option value="">Selecione manualmente um processo</option>
                              {matchingProcesses.map((processo) => (
                                <option key={processo.id} value={processo.id}>{processo.numero_cnj}</option>
                              ))}
                            </select>
                          </label>
                          <button
                            type="button"
                            onClick={() => associateCandidate(candidate)}
                            disabled={!candidate.associacaoDisponivel || !selectedProcessByHash[item.hash] || Boolean(associatingHash) || processosLoading}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#17191a] px-3 text-xs font-semibold text-white transition hover:bg-[#303334] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                          >
                            {associatingHash === item.hash ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                            {associatingHash === item.hash ? "Associando…" : "Associar manualmente"}
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-600 dark:text-zinc-300">
                          {podeLerProcessos
                            ? "Seu perfil não pode associar publicações a processos."
                            : "A associação exige acesso de leitura e escrita em processos."}
                        </p>
                      )}
                      {matchingProcesses.length === 0 && (
                        <p className="mt-2 text-xs text-gray-600 dark:text-zinc-300">
                          Não há processo deste cliente com o mesmo número CNJ. Cadastre ou vincule o processo manualmente antes de associar; esta busca não cria processos.
                        </p>
                      )}
                      {!candidate.associacaoDisponivel && (
                        <p className="mt-2 text-xs text-gray-600 dark:text-zinc-300">
                          Este resultado é muito extenso para uma associação segura nesta sessão. Revise-o no tribunal; nenhuma associação será feita por este botão.
                        </p>
                      )}
                      <p className="mt-2 text-[11px] leading-5 text-gray-500 dark:text-zinc-400">
                        A confirmação grava a publicação no processo que você selecionar. O nome é apenas uma pista de busca; não cria cliente, processo ou prazo.
                      </p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
