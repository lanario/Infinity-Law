"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BriefcaseBusiness, ChevronDown, ExternalLink, Search, X } from "lucide-react";
import type { Associacao, Monitoramento, Processo, Publicacao } from "./types";

interface DjenPublicationsSectionProps {
  publicacoes: Publicacao[];
  associacoes: Associacao[];
  monitoramentos: Monitoramento[];
  processos: Processo[];
  podeLerProcessos: boolean;
  publicationError: string | null;
  relatedDataError: string | null;
}

function formatDate(value: string | null) {
  if (!value) return "Data não informada";
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString("pt-BR", { timeZone: "UTC", dateStyle: "medium" })
    : "Data não informada";
}

function normalizeSearch(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function searchableLawyers(advogados: unknown[]) {
  return advogados.map((advogado) => {
    try {
      return JSON.stringify(advogado) ?? "";
    } catch {
      return "";
    }
  }).join(" ");
}

function recordString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function describeLawyer(value: unknown) {
  if (typeof value === "string") return value.trim() || "Advogado destinatário";
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "Advogado destinatário";
  }

  const record = value as Record<string, unknown>;
  const name = recordString(record, ["nome", "name"]);
  const number = recordString(record, ["numero_oab", "numeroOab", "numeroOAB", "numero", "oab"]);
  const state = recordString(record, ["uf_oab", "ufOab", "ufOAB", "uf"]);
  const oab = [number, state].filter(Boolean).join("/");
  return [name, oab ? `OAB ${oab}` : ""].filter(Boolean).join(" · ") || "Advogado destinatário";
}

function poloLabel(polo: string | null | undefined) {
  if (!polo) return null;
  const labels: Record<string, string> = {
    A: "Polo ativo",
    P: "Polo passivo",
    T: "Terceiro interessado",
  };
  return labels[polo.toUpperCase()] ?? polo;
}

function DetailField({ label, children }: { label: string; children: ReactNode }) {
  if (children === null || children === undefined || children === "") return null;
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-1 break-words text-xs leading-5 text-gray-700">{children}</dd>
    </div>
  );
}

export function DjenPublicationsSection({
  publicacoes,
  associacoes,
  monitoramentos,
  processos,
  podeLerProcessos,
  publicationError,
  relatedDataError,
}: DjenPublicationsSectionProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const [query, setQuery] = useState("");
  const [tribunalFilter, setTribunalFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const monitorById = new Map(monitoramentos.map((monitoramento) => [monitoramento.id, monitoramento]));
  const processById = new Map(processos.map((processo) => [processo.id, processo]));
  const associationsByPublication = new Map<string, Monitoramento[]>();

  for (const associacao of associacoes) {
    const monitoramento = monitorById.get(associacao.monitoramento_id);
    if (!monitoramento) continue;
    const foundBy = associationsByPublication.get(associacao.publicacao_id) ?? [];
    foundBy.push(monitoramento);
    associationsByPublication.set(associacao.publicacao_id, foundBy);
  }

  const tribunais = useMemo(
    () => Array.from(new Set(publicacoes.map((item) => item.tribunal).filter((value): value is string => Boolean(value))))
      .sort((a, b) => a.localeCompare(b, "pt-BR")),
    [publicacoes]
  );
  const tipos = useMemo(
    () => Array.from(new Set(publicacoes.map((item) => item.tipo_comunicacao).filter((value): value is string => Boolean(value))))
      .sort((a, b) => a.localeCompare(b, "pt-BR")),
    [publicacoes]
  );
  const filteredPublicacoes = useMemo(() => {
    const normalizedQuery = normalizeSearch(query.trim());
    return publicacoes.filter((publicacao) => {
      if (tribunalFilter && publicacao.tribunal !== tribunalFilter) return false;
      if (typeFilter && publicacao.tipo_comunicacao !== typeFilter) return false;
      if (!normalizedQuery) return true;

      const searchableText = normalizeSearch([
        publicacao.numero_processo_com_mascara,
        publicacao.numero_processo,
        publicacao.tribunal,
        publicacao.tipo_comunicacao,
        publicacao.orgao,
        publicacao.nome_classe,
        publicacao.tipo_documento,
        publicacao.texto,
        ...publicacao.destinatarios.map((destinatario) => destinatario.nome),
        searchableLawyers(publicacao.destinatario_advogados),
      ].filter(Boolean).join(" "));
      return searchableText.includes(normalizedQuery);
    });
  }, [publicacoes, query, tribunalFilter, typeFilter]);

  function toggleExpanded(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearFilters() {
    setQuery("");
    setTribunalFilter("");
    setTypeFilter("");
  }

  const hasFilters = Boolean(query || tribunalFilter || typeFilter);

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm" aria-labelledby="djen-publications-heading">
      <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="djen-publications-heading" className="text-base font-semibold text-gray-900">Publicações recebidas</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Confira o teor e os dados da comunicação. A data exibida é a disponibilização no diário e não representa vencimento de prazo.
            </p>
          </div>
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600" aria-live="polite">
            {filteredPublicacoes.length} de {publicacoes.length} carregadas
          </span>
        </div>
        <p className="mt-3 text-[11px] text-gray-400">
          {publicacoes.length === 100
            ? "Exibindo até as 100 publicações mais recentes carregadas deste escritório."
            : `${publicacoes.length} publicação(ões) carregada(s) deste escritório.`}
          {" "}Filtros locais; não consultam o CNJ.
        </p>

        {publicacoes.length > 0 && !publicationError && (
          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,0.45fr)_minmax(10rem,0.45fr)]">
            <label className="relative block text-xs font-medium text-gray-600">
              Buscar nas publicações carregadas
              <span className="pointer-events-none absolute left-3 top-[2.15rem] text-gray-400" aria-hidden="true">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Processo, teor, tribunal, destinatário…"
                className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm font-normal text-gray-800 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/10"
              />
            </label>
            <label className="text-xs font-medium text-gray-600">
              Tribunal
              <select
                value={tribunalFilter}
                onChange={(event) => setTribunalFilter(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal text-gray-700 outline-none focus:border-gold focus:ring-2 focus:ring-gold/10"
              >
                <option value="">Todos os tribunais</option>
                {tribunais.map((tribunal) => <option key={tribunal} value={tribunal}>{tribunal}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-gray-600">
              Tipo de comunicação
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal text-gray-700 outline-none focus:border-gold focus:ring-2 focus:ring-gold/10"
              >
                <option value="">Todos os tipos</option>
                {tipos.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
              </select>
            </label>
          </div>
        )}
        {hasFilters && !publicationError && (
          <button
            type="button"
            onClick={clearFilters}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-gold-dark hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Limpar filtros
          </button>
        )}
      </div>

      {relatedDataError && (
        <div className="border-b border-amber-100 bg-amber-50 px-5 py-3 text-xs leading-5 text-amber-900 sm:px-6" role="status">
          {relatedDataError}
        </div>
      )}

      {publicationError ? (
        <div className="px-5 py-10 text-center text-sm text-gray-500 sm:px-6" role="status">
          {publicationError}
        </div>
      ) : publicacoes.length === 0 ? (
        <div className="px-5 py-10 text-center sm:px-6">
          <p className="text-sm font-medium text-gray-700">Nenhuma publicação salva ainda.</p>
          <p className="mt-1 text-sm text-gray-400">
            Consulte o DJEN por OAB ou cliente nos controles abaixo para trazer publicações a este painel.
          </p>
        </div>
      ) : filteredPublicacoes.length === 0 ? (
        <div className="px-5 py-10 text-center sm:px-6" role="status">
          <p className="text-sm font-medium text-gray-700">Nenhuma publicação corresponde aos filtros.</p>
          <button type="button" onClick={clearFilters} className="mt-2 text-xs font-medium text-gold-dark hover:text-gold">
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          <AnimatePresence initial={false} mode="popLayout">
            {filteredPublicacoes.map((publicacao) => {
              const foundBy = associationsByPublication.get(publicacao.id) ?? [];
              const process = publicacao.processo_id
                ? processById.get(publicacao.processo_id)
                : undefined;
              const caseNumber = publicacao.numero_processo_com_mascara
                ?? publicacao.numero_processo
                ?? "Processo não informado";
              const isExpanded = expandedIds.has(publicacao.id);
              const hasExtraDetails = Boolean(
                publicacao.texto
                || publicacao.meio
                || publicacao.meio_completo
                || publicacao.tipo_documento
                || publicacao.codigo_classe
                || publicacao.numero_comunicacao !== null
                || publicacao.comunicacao_ativa !== null
                || publicacao.destinatarios.length
                || publicacao.destinatario_advogados.length
              );

              return (
                <motion.article
                  key={publicacao.id}
                  layout={!reduceMotion}
                  initial={reduceMotion ? false : { opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -3 }}
                  transition={{ duration: reduceMotion ? 0 : 0.16, ease: "easeOut" }}
                  className="px-5 py-5 sm:px-6"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <p className="rounded-full bg-gold-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-gold-dark">
                          {publicacao.tipo_comunicacao ?? "Comunicação judicial"}
                        </p>
                        <p className="text-xs text-gray-500">
                          Disponibilizada em{" "}
                          <time dateTime={publicacao.data_disponibilizacao ?? undefined} className="font-medium text-gray-700">
                            {formatDate(publicacao.data_disponibilizacao)}
                          </time>
                        </p>
                      </div>

                      <p className="mt-2 break-all font-mono text-sm font-semibold text-gray-900">
                        {podeLerProcessos && process ? (
                          <Link href={`/processos/${process.id}`} className="underline decoration-gray-300 underline-offset-2 hover:text-gold-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
                            {process.numero_cnj ?? "Processo sem número CNJ"}
                          </Link>
                        ) : caseNumber}
                      </p>
                      {publicacao.processo_id && process && podeLerProcessos && (
                        <span className="mt-1 inline-flex items-center gap-1 font-sans text-[10px] text-emerald-700">
                          <BriefcaseBusiness className="h-3 w-3" aria-hidden="true" />
                          Processo vinculado
                        </span>
                      )}

                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                        <span><span className="font-medium text-gray-700">Tribunal:</span> {publicacao.tribunal ?? "Não informado"}</span>
                        {publicacao.orgao && <span><span className="font-medium text-gray-700">Órgão:</span> {publicacao.orgao}</span>}
                        {publicacao.nome_classe && <span><span className="font-medium text-gray-700">Classe:</span> {publicacao.nome_classe}</span>}
                      </div>

                      {publicacao.destinatarios.length > 0 && (
                        <p className="mt-2 text-xs leading-5 text-gray-500">
                          <span className="font-medium text-gray-700">Destinatários:</span>{" "}
                          {publicacao.destinatarios.slice(0, 3).map((destinatario, index) => (
                            <span key={`${destinatario.nome ?? "destinatario"}-${index}`}>
                              {index > 0 ? "; " : ""}
                              {destinatario.nome ?? "Nome não informado"}
                              {poloLabel(destinatario.polo) ? ` · ${poloLabel(destinatario.polo)}` : ""}
                            </span>
                          ))}
                          {publicacao.destinatarios.length > 3 && `; +${publicacao.destinatarios.length - 3}`}
                        </p>
                      )}

                      {publicacao.destinatario_advogados.length > 0 && (
                        <p className="mt-1 text-xs leading-5 text-gray-500">
                          <span className="font-medium text-gray-700">Advogado destinatário:</span>{" "}
                          {describeLawyer(publicacao.destinatario_advogados[0])}
                          {publicacao.destinatario_advogados.length > 1 && `; +${publicacao.destinatario_advogados.length - 1}`}
                        </p>
                      )}

                      {foundBy.length > 0 && (
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] text-gray-400">Localizada por</span>
                          {foundBy.map((monitoramento) => (
                            <span key={monitoramento.id} className="rounded-full bg-gray-100 px-2 py-0.5 font-mono text-[10px] text-gray-600">
                              {monitoramento.numero_oab}/{monitoramento.uf_oab}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {publicacao.link && (
                      <a
                        href={publicacao.link}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-gold-dark hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                      >
                        Abrir no tribunal
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    )}
                  </div>

                  {hasExtraDetails && (
                    <div className="mt-4 border-t border-gray-100 pt-3">
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        aria-controls={`djen-publication-details-${publicacao.id}`}
                        onClick={() => toggleExpanded(publicacao.id)}
                        className="inline-flex items-center gap-2 rounded-md text-xs font-medium text-gray-600 transition hover:text-gold-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                      >
                        {isExpanded ? "Ocultar detalhes" : "Ver teor e detalhes da comunicação"}
                        <ChevronDown className={`h-3.5 w-3.5 ${reduceMotion ? "" : "transition-transform"} ${isExpanded ? "rotate-180" : ""}`} aria-hidden="true" />
                      </button>
                      <motion.div
                        id={`djen-publication-details-${publicacao.id}`}
                        aria-hidden={!isExpanded}
                        initial={false}
                        animate={isExpanded
                          ? { height: "auto", opacity: 1 }
                          : { height: 0, opacity: 0 }}
                        transition={{ duration: reduceMotion ? 0 : 0.18, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <dl className="mt-3 grid gap-x-5 gap-y-4 rounded-xl bg-gray-50 p-4 sm:grid-cols-2 lg:grid-cols-3">
                          <DetailField label="Tipo de documento">{publicacao.tipo_documento}</DetailField>
                          <DetailField label="Meio">
                            {[publicacao.meio_completo, publicacao.meio].filter(Boolean).join(" · ")}
                          </DetailField>
                          <DetailField label="Código da classe">{publicacao.codigo_classe}</DetailField>
                          <DetailField label="Número da comunicação">
                            {publicacao.numero_comunicacao === null ? null : publicacao.numero_comunicacao}
                          </DetailField>
                          <DetailField label="Situação da comunicação">
                            {publicacao.comunicacao_ativa === null
                              ? null
                              : publicacao.comunicacao_ativa ? "Ativa" : "Inativa"}
                          </DetailField>
                          {publicacao.destinatarios.length > 0 && (
                            <DetailField label="Destinatários e polos">
                              {publicacao.destinatarios.map((destinatario, index) => (
                                <span key={`${destinatario.nome ?? "destinatario"}-detail-${index}`} className="block">
                                  {destinatario.nome ?? "Nome não informado"}
                                  {poloLabel(destinatario.polo) ? ` · ${poloLabel(destinatario.polo)}` : ""}
                                </span>
                              ))}
                            </DetailField>
                          )}
                          {publicacao.destinatario_advogados.length > 0 && (
                            <DetailField label="Advogados destinatários">
                              {publicacao.destinatario_advogados.map((advogado, index) => (
                                <span key={`advogado-${publicacao.id}-${index}`} className="block">
                                  {describeLawyer(advogado)}
                                </span>
                              ))}
                            </DetailField>
                          )}
                        </dl>
                        {publicacao.texto && (
                          <div className="mt-3 rounded-xl border border-gray-100 bg-white p-4">
                            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Teor da publicação</h3>
                            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">
                              {publicacao.texto}
                            </p>
                          </div>
                        )}
                      </motion.div>
                    </div>
                  )}
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}
