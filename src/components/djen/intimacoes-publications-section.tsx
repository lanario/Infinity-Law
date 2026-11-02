"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BellRing,
  BriefcaseBusiness,
  Building2,
  Calendar,
  ChevronDown,
  ExternalLink,
  FileSearch,
  Scale,
  Search,
  Users,
  X,
} from "lucide-react";
import type { Associacao, Monitoramento, Processo, Publicacao } from "./types";

interface DjenPublicationsSectionProps {
  publicacoes: Publicacao[];
  associacoes: Associacao[];
  monitoramentos: Monitoramento[];
  processos: Processo[];
  podeLerProcessos: boolean;
  publicationError: string | null;
  relatedDataError: string | null;
  onGoToMonitoring?: () => void;
  onGoToClientSearch?: () => void;
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
  return advogados
    .map((advogado) => {
      try {
        return JSON.stringify(advogado) ?? "";
      } catch {
        return "";
      }
    })
    .join(" ");
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
      <dt className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-zinc-500">{label}</dt>
      <dd className="mt-1 break-words text-xs leading-5 text-stone-700 dark:text-zinc-200">{children}</dd>
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
  onGoToMonitoring,
  onGoToClientSearch,
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
    () =>
      Array.from(new Set(publicacoes.map((item) => item.tribunal).filter((value): value is string => Boolean(value)))).sort(
        (a, b) => a.localeCompare(b, "pt-BR")
      ),
    [publicacoes]
  );

  const tipos = useMemo(
    () =>
      Array.from(
        new Set(publicacoes.map((item) => item.tipo_comunicacao).filter((value): value is string => Boolean(value)))
      ).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [publicacoes]
  );

  const filteredPublicacoes = useMemo(() => {
    const normalizedQuery = normalizeSearch(query.trim());
    return publicacoes.filter((publicacao) => {
      if (tribunalFilter && publicacao.tribunal !== tribunalFilter) return false;
      if (typeFilter && publicacao.tipo_comunicacao !== typeFilter) return false;
      if (!normalizedQuery) return true;

      const searchableText = normalizeSearch(
        [
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
        ]
          .filter(Boolean)
          .join(" ")
      );
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
    <section
      className="space-y-4"
      aria-labelledby="djen-publications-heading"
    >
      {/* Barra de Filtros e Resumo Onyx & Gold */}
      <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm dark:border-zinc-800/80 dark:bg-[#17191A] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold-dark dark:bg-gold/15 dark:text-[#E5C158]">
              <Scale className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="djen-publications-heading" className="text-base font-bold text-stone-900 dark:text-zinc-100 sm:text-lg">
                Publicações Recebidas
              </h2>
              <p className="mt-0.5 text-xs text-stone-500 dark:text-zinc-400">
                Diário de Justiça Eletrônico Nacional (DJEN). A data corresponde à disponibilização oficial no diário.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-200/80 bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-700 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-300"
              aria-live="polite"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              {filteredPublicacoes.length} de {publicacoes.length} salvas
            </span>
          </div>
        </div>

        {publicacoes.length > 0 && !publicationError && (
          <div className="mt-5 grid gap-3 border-t border-stone-100 pt-5 dark:border-zinc-800/80 sm:grid-cols-[minmax(0,1fr)_minmax(11rem,0.45fr)_minmax(11rem,0.45fr)]">
            <label className="relative block text-xs font-semibold text-stone-600 dark:text-zinc-300">
              Buscar publicações salvas
              <span className="pointer-events-none absolute left-3 top-[2.25rem] text-stone-400 dark:text-zinc-500" aria-hidden="true">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Processo, teor, tribunal, destinatário…"
                className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-stone-50/60 py-2 pl-9 pr-3 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 hover:border-stone-300 hover:bg-white focus:border-gold focus:bg-white focus:ring-4 focus:ring-gold/15 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:focus:bg-zinc-900"
              />
            </label>
            <label className="text-xs font-semibold text-stone-600 dark:text-zinc-300">
              Filtrar por Tribunal
              <select
                value={tribunalFilter}
                onChange={(event) => setTribunalFilter(event.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-stone-50/60 px-3 text-sm text-stone-800 outline-none transition hover:border-stone-300 hover:bg-white focus:border-gold focus:bg-white focus:ring-4 focus:ring-gold/15 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:focus:bg-zinc-900"
              >
                <option value="">Todos os tribunais</option>
                {tribunais.map((tribunal) => (
                  <option key={tribunal} value={tribunal}>
                    {tribunal}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-stone-600 dark:text-zinc-300">
              Tipo de comunicação
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-stone-50/60 px-3 text-sm text-stone-800 outline-none transition hover:border-stone-300 hover:bg-white focus:border-gold focus:bg-white focus:ring-4 focus:ring-gold/15 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:focus:bg-zinc-900"
              >
                <option value="">Todos os tipos</option>
                {tipos.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {hasFilters && !publicationError && (
          <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-3 dark:border-zinc-800/80">
            <span className="text-xs text-stone-500 dark:text-zinc-400">
              Filtro ativo: {filteredPublicacoes.length} de {publicacoes.length} publicação(ões) exibida(s)
            </span>
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold-dark hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold dark:text-[#E5C158]"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      {relatedDataError && (
        <div
          className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs leading-5 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
          role="status"
        >
          {relatedDataError}
        </div>
      )}

      {publicationError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-8 text-center text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300" role="status">
          {publicationError}
        </div>
      ) : publicacoes.length === 0 ? (
        /* Empty State Alto Padrão Visual */
        <div className="rounded-2xl border border-stone-200/80 bg-white p-10 text-center shadow-sm dark:border-zinc-800/80 dark:bg-[#17191A] sm:p-14">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gold/10 text-gold-dark ring-8 ring-gold/5 dark:bg-gold/15 dark:text-[#E5C158] dark:ring-gold/10">
            <Scale className="h-8 w-8" aria-hidden="true" />
          </div>
          <h3 className="mt-5 text-base font-bold text-stone-900 dark:text-zinc-100 sm:text-lg">
            Nenhuma publicação salva ainda
          </h3>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-stone-500 dark:text-zinc-400 sm:text-sm">
            Monitore suas OABs ou realize consultas pontuais por cliente cadastrado para carregar e acompanhar todas as intimações do diário oficial.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {onGoToMonitoring && (
              <button
                type="button"
                onClick={onGoToMonitoring}
                className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-xs font-bold text-[#17191A] shadow-sm transition hover:bg-gold-hover hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/20"
              >
                <BellRing className="h-4 w-4" aria-hidden="true" />
                Configurar Monitoramento de OAB
              </button>
            )}
            {onGoToClientSearch && (
              <button
                type="button"
                onClick={onGoToClientSearch}
                className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                <FileSearch className="h-4 w-4" aria-hidden="true" />
                Buscar por Cliente
              </button>
            )}
          </div>
        </div>
      ) : filteredPublicacoes.length === 0 ? (
        <div className="rounded-2xl border border-stone-200/80 bg-white p-10 text-center shadow-sm dark:border-zinc-800/80 dark:bg-[#17191A]" role="status">
          <p className="text-sm font-semibold text-stone-800 dark:text-zinc-200">
            Nenhuma publicação corresponde aos filtros selecionados.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-gold-dark transition hover:bg-stone-50 dark:border-zinc-700 dark:text-[#E5C158] dark:hover:bg-zinc-800"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Limpar todos os filtros
          </button>
        </div>
      ) : (
        /* Lista de Cards com ScrollTrigger (whileInView) */
        <div className="space-y-3.5">
          <AnimatePresence initial={false}>
            {filteredPublicacoes.map((publicacao) => {
              const foundBy = associationsByPublication.get(publicacao.id) ?? [];
              const process = publicacao.processo_id
                ? processById.get(publicacao.processo_id)
                : undefined;
              const caseNumber =
                publicacao.numero_processo_com_mascara ??
                publicacao.numero_processo ??
                "Processo não informado";
              const isExpanded = expandedIds.has(publicacao.id);
              const hasExtraDetails = Boolean(
                publicacao.texto ||
                  publicacao.meio ||
                  publicacao.meio_completo ||
                  publicacao.tipo_documento ||
                  publicacao.codigo_classe ||
                  publicacao.numero_comunicacao !== null ||
                  publicacao.comunicacao_ativa !== null ||
                  publicacao.destinatarios.length ||
                  publicacao.destinatario_advogados.length
              );

              return (
                <motion.article
                  key={publicacao.id}
                  layout={!reduceMotion}
                  initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-20px" }}
                  transition={{ duration: reduceMotion ? 0 : 0.28, ease: "easeOut" }}
                  className="group relative overflow-hidden rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:border-gold/30 hover:shadow-md dark:border-zinc-800/80 dark:bg-[#17191A] dark:hover:border-gold/30 sm:p-6"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      {/* Badges de Tipo, Tribunal e Data */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-gold/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-dark dark:bg-gold/15 dark:text-[#E5C158]">
                          {publicacao.tipo_comunicacao ?? "Comunicação judicial"}
                        </span>
                        {publicacao.tribunal && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-stone-200/70 bg-stone-50 px-2.5 py-0.5 text-[10px] font-semibold text-stone-600 dark:border-zinc-700/80 dark:bg-zinc-800/80 dark:text-zinc-300">
                            <Building2 className="h-3 w-3" aria-hidden="true" />
                            {publicacao.tribunal}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-xs text-stone-500 dark:text-zinc-400">
                          <Calendar className="h-3 w-3" aria-hidden="true" />
                          Disponibilizada em{" "}
                          <time
                            dateTime={publicacao.data_disponibilizacao ?? undefined}
                            className="font-semibold text-stone-700 dark:text-zinc-200"
                          >
                            {formatDate(publicacao.data_disponibilizacao)}
                          </time>
                        </span>
                      </div>

                      {/* Número do Processo */}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <p className="break-all font-mono text-base font-bold text-stone-900 dark:text-zinc-100">
                          {podeLerProcessos && process ? (
                            <Link
                              href={`/processos/${process.id}`}
                              className="decoration-gold underline underline-offset-4 transition hover:text-gold-dark dark:hover:text-[#E5C158]"
                            >
                              {process.numero_cnj ?? "Processo sem número CNJ"}
                            </Link>
                          ) : (
                            caseNumber
                          )}
                        </p>
                        {publicacao.processo_id && process && podeLerProcessos && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                            <BriefcaseBusiness className="h-3 w-3" aria-hidden="true" />
                            Processo Vinculado
                          </span>
                        )}
                      </div>

                      {/* Detalhes de Órgão e Classe */}
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500 dark:text-zinc-400">
                        {publicacao.orgao && (
                          <span>
                            <strong className="font-semibold text-stone-700 dark:text-zinc-300">Órgão:</strong>{" "}
                            {publicacao.orgao}
                          </span>
                        )}
                        {publicacao.nome_classe && (
                          <span>
                            <strong className="font-semibold text-stone-700 dark:text-zinc-300">Classe:</strong>{" "}
                            {publicacao.nome_classe}
                          </span>
                        )}
                      </div>

                      {/* Destinatários */}
                      {publicacao.destinatarios.length > 0 && (
                        <div className="mt-2.5 flex items-start gap-1.5 text-xs text-stone-600 dark:text-zinc-400">
                          <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400 dark:text-zinc-500" aria-hidden="true" />
                          <p className="leading-5">
                            <strong className="font-semibold text-stone-800 dark:text-zinc-200">Destinatários:</strong>{" "}
                            {publicacao.destinatarios.slice(0, 3).map((destinatario, index) => (
                              <span key={`${destinatario.nome ?? "destinatario"}-${index}`}>
                                {index > 0 ? "; " : ""}
                                {destinatario.nome ?? "Nome não informado"}
                                {poloLabel(destinatario.polo) ? ` (${poloLabel(destinatario.polo)})` : ""}
                              </span>
                            ))}
                            {publicacao.destinatarios.length > 3 && (
                              <span className="font-semibold text-gold-dark dark:text-[#E5C158]">
                                {" "}+ {publicacao.destinatarios.length - 3} mais
                              </span>
                            )}
                          </p>
                        </div>
                      )}

                      {/* Advogado Destinatário */}
                      {publicacao.destinatario_advogados.length > 0 && (
                        <p className="mt-1 text-xs leading-5 text-stone-500 dark:text-zinc-400">
                          <strong className="font-semibold text-stone-700 dark:text-zinc-300">Advogado:</strong>{" "}
                          {describeLawyer(publicacao.destinatario_advogados[0])}
                          {publicacao.destinatario_advogados.length > 1 && (
                            <span className="font-semibold text-gold-dark dark:text-[#E5C158]">
                              {" "}e outros {publicacao.destinatario_advogados.length - 1}
                            </span>
                          )}
                        </p>
                      )}

                      {/* Tags de OABs que localizaram */}
                      {foundBy.length > 0 && (
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-stone-400 dark:text-zinc-500">
                            Localizada por:
                          </span>
                          {foundBy.map((monitoramento) => (
                            <span
                              key={monitoramento.id}
                              className="rounded-lg border border-stone-200/70 bg-stone-50 px-2 py-0.5 font-mono text-[10px] font-bold text-stone-700 dark:border-zinc-800 dark:bg-zinc-800/80 dark:text-zinc-300"
                            >
                              OAB {monitoramento.numero_oab}/{monitoramento.uf_oab}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Ação do link externo */}
                    {publicacao.link && (
                      <a
                        href={publicacao.link}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-sm transition hover:border-gold hover:text-gold-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:border-gold dark:hover:text-[#E5C158]"
                      >
                        Abrir no tribunal
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    )}
                  </div>

                  {/* Acordeão do teor com Framer Motion */}
                  {hasExtraDetails && (
                    <div className="mt-4 border-t border-stone-100 pt-3 dark:border-zinc-800/80">
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        aria-controls={`djen-publication-details-${publicacao.id}`}
                        onClick={() => toggleExpanded(publicacao.id)}
                        className="inline-flex items-center gap-2 rounded-lg text-xs font-semibold text-stone-600 transition hover:text-gold-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold dark:text-zinc-400 dark:hover:text-[#E5C158]"
                      >
                        <span>{isExpanded ? "Ocultar teor e detalhes da intimação" : "Ver teor completo e detalhes da intimação"}</span>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-180 text-gold" : ""}`}
                          aria-hidden="true"
                        />
                      </button>

                      <motion.div
                        id={`djen-publication-details-${publicacao.id}`}
                        aria-hidden={!isExpanded}
                        initial={false}
                        animate={
                          isExpanded
                            ? { height: "auto", opacity: 1 }
                            : { height: 0, opacity: 0 }
                        }
                        transition={{ duration: reduceMotion ? 0 : 0.22, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        {publicacao.texto && (
                          <div className="mt-3.5 rounded-xl border border-stone-200/80 bg-stone-50/70 p-4 dark:border-zinc-800/80 dark:bg-[#101213]">
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-gold-dark dark:text-[#E5C158]">
                              Teor da publicação
                            </h4>
                            <p className="mt-2 select-text whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-stone-800 dark:text-zinc-200">
                              {publicacao.texto}
                            </p>
                          </div>
                        )}

                        <dl className="mt-3 grid gap-x-4 gap-y-3 rounded-xl border border-stone-200/60 bg-white p-4 dark:border-zinc-800/60 dark:bg-zinc-900/40 sm:grid-cols-2 lg:grid-cols-3">
                          <DetailField label="Tipo de documento">{publicacao.tipo_documento}</DetailField>
                          <DetailField label="Meio de comunicação">
                            {[publicacao.meio_completo, publicacao.meio].filter(Boolean).join(" · ")}
                          </DetailField>
                          <DetailField label="Código da classe">{publicacao.codigo_classe}</DetailField>
                          <DetailField label="Número da comunicação">
                            {publicacao.numero_comunicacao === null ? null : publicacao.numero_comunicacao}
                          </DetailField>
                          <DetailField label="Situação da comunicação">
                            {publicacao.comunicacao_ativa === null
                              ? null
                              : publicacao.comunicacao_ativa
                              ? "Ativa"
                              : "Inativa"}
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
