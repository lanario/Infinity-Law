"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Clock,
  Gavel,
  CalendarClock,
  Copy,
  Check,
  ChevronRight,
  Video,
  MapPin,
} from "lucide-react";
import { cn, formatCNJ } from "@/lib/utils";
import { toSafeVideoconfHref } from "@/lib/validations/evento.schema";
import { format, differenceInHours, differenceInMinutes, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarPlus } from "lucide-react";

export interface DocketEventItem {
  id: string;
  titulo: string;
  tipo: "prazo" | "audiencia" | string;
  inicio: string; // ISO string
  fim?: string | null;
  processo_id?: string | null;
  processo?: {
    numero_cnj: string;
    tribunal?: string | null;
    comarca?: string | null;
    vara?: string | null;
  } | null;
  responsavel?: string | null;
  local?: string | null;
  link_videoconf?: string | null;
  descricao?: string | null;
}

export interface CriticalDocketCardProps {
  events: DocketEventItem[];
  className?: string;
  title?: string;
  subtitle?: string;
}

type FilterMode = "todos" | "prazo" | "audiencia";

interface UrgencyBadgeInfo {
  label: string;
  pillClass: string;
  dotClass: string;
  isPulsing: boolean;
  level: "fatal" | "urgente" | "noprazo";
}

function calculateUrgency(dateIso: string): UrgencyBadgeInfo {
  const now = new Date();
  const target = parseISO(dateIso);
  const diffHours = differenceInHours(target, now);
  const diffMinutes = differenceInMinutes(target, now);

  // Menos de 24 horas -> Fatal
  if (diffHours < 24) {
    let displayTime = "";
    if (diffHours <= 0) {
      if (diffMinutes <= 0) {
        displayTime = "Hoje";
      } else {
        displayTime = `${Math.max(1, diffMinutes)}m`;
      }
    } else {
      displayTime = `${diffHours}h`;
    }

    return {
      label: `Fatal · ${displayTime}`,
      level: "fatal",
      pillClass:
        "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/25 shadow-sm",
      dotClass: "bg-rose-500",
      isPulsing: true,
    };
  }

  // Menos de 48 horas -> Urgente
  if (diffHours < 48) {
    const days = Math.max(1, Math.floor(diffHours / 24));
    return {
      label: `Urgente · ${days}d`,
      level: "urgente",
      pillClass:
        "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25 shadow-sm",
      dotClass: "bg-amber-500",
      isPulsing: false,
    };
  }

  // Acima de 48 horas (próximos 7 dias) -> No prazo
  const days = Math.ceil(diffHours / 24);
  return {
    label: `No prazo · ${days}d`,
    level: "noprazo",
    pillClass:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 shadow-sm",
    dotClass: "bg-emerald-500",
    isPulsing: false,
  };
}

export function CriticalDocketCard({
  events,
  className,
  title = "Pauta Fatal & Audiências",
  subtitle = "Prazos peremptórios e audiências dos próximos 7 dias",
}: CriticalDocketCardProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("todos");

  const allEvents = events;

  // Filtro por tipo
  const filteredEvents = useMemo(() => {
    if (filter === "todos") return allEvents;
    return allEvents.filter((e) => e.tipo.toLowerCase() === filter);
  }, [allEvents, filter]);

  // Contadores para o header
  const counts = useMemo(() => {
    const fatalCount = allEvents.filter((e) => {
      const hours = differenceInHours(parseISO(e.inicio), new Date());
      return e.tipo.toLowerCase() === "prazo" && hours >= 0 && hours < 24;
    }).length;

    const prazosCount = allEvents.filter((e) => e.tipo.toLowerCase() === "prazo").length;
    const audienciasCount = allEvents.filter((e) => e.tipo.toLowerCase() === "audiencia").length;

    return { fatalCount, prazosCount, audienciasCount, total: allEvents.length };
  }, [allEvents]);

  // Microinteração para copiar o número do CNJ
  const handleCopyCnj = async (e: React.MouseEvent, cnjRaw: string, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const cleanCnj = cnjRaw.trim();
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(cleanCnj);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 1800);
      }
    } catch (err) {
      console.error("Falha ao copiar número CNJ:", err);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        "bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-sm p-6",
        "transition-colors duration-150",
        className
      )}
    >
      {/* Header do Card */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-gray-100 dark:border-zinc-800">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FBF6E9] text-[#9A7A1A] border border-[#D4AF37]/30 shadow-sm">
            <CalendarClock className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100">
                {title}
              </h2>
              {counts.fatalCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/25">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  {counts.fatalCount} prazo{counts.fatalCount > 1 ? "s" : ""} em até 24h
                </span>
              )}
            </div>
            <p className="text-xs font-light text-gray-500 dark:text-zinc-400 mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Filtros em Segmented Pill */}
        <div className="inline-flex items-center self-start sm:self-auto p-1 bg-gray-100/80 dark:bg-zinc-800/60 rounded-full border border-gray-200/60 dark:border-zinc-700 text-xs font-normal">
          <button
            type="button"
            onClick={() => setFilter("todos")}
            className={cn(
              "px-3 py-1 rounded-full transition-colors duration-150",
              filter === "todos"
                ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 shadow-sm font-bold"
                : "text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200"
            )}
          >
            Todos ({counts.total})
          </button>
          <button
            type="button"
            onClick={() => setFilter("prazo")}
            className={cn(
              "px-3 py-1 rounded-full transition-colors duration-150 flex items-center gap-1",
              filter === "prazo"
                ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 shadow-sm font-bold"
                : "text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200"
            )}
          >
            <Clock className="h-3 w-3" />
            Prazos ({counts.prazosCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("audiencia")}
            className={cn(
              "px-3 py-1 rounded-full transition-colors duration-150 flex items-center gap-1",
              filter === "audiencia"
                ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 shadow-sm font-bold"
                : "text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200"
            )}
          >
            <Gavel className="h-3 w-3" />
            Audiências ({counts.audienciasCount})
          </button>
        </div>
      </div>

      {/* Lista de Eventos com Animação Stagger do Framer Motion */}
      {filteredEvents.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 dark:bg-zinc-800 text-gray-600 border border-gray-200/60 mb-3">
            <Check className="h-6 w-6 text-[#9A7A1A]" />
          </div>
          <p className="text-sm font-bold text-gray-700 dark:text-zinc-300">
            Nenhuma ocorrência encontrada
          </p>
          <p className="text-xs font-light text-gray-400 dark:text-zinc-500 mt-1">
            Ainda não há prazos ou audiências para este filtro nos próximos 7 dias.
          </p>
          <div className="mt-4 flex justify-center gap-4 text-xs font-bold">
            <Link href="/agenda?novo=prazo" className="text-[#9A7A1A] hover:underline dark:text-[#D4AF37]">
              <CalendarPlus className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
              Cadastrar prazo
            </Link>
            <Link href="/agenda?novo=audiencia" className="text-gray-700 hover:underline dark:text-zinc-300">
              Agendar audiência
            </Link>
          </div>
        </div>
      ) : (
        <motion.div
          key={filter}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="divide-y divide-gray-100 dark:divide-zinc-800 mt-1"
        >
          {filteredEvents.map((item) => {
            const isAudiencia = item.tipo.toLowerCase() === "audiencia";
            const urgency = isAudiencia ? null : calculateUrgency(item.inicio);
            const dateObj = parseISO(item.inicio);
            const formattedDate = format(dateObj, "dd 'de' MMM, HH:mm", { locale: ptBR });
            const videoconfHref = toSafeVideoconfHref(item.link_videoconf);
            const cnjDisplay = item.processo?.numero_cnj
              ? formatCNJ(item.processo.numero_cnj)
              : null;
            const isCopied = copiedId === item.id;

            return (
              <motion.div
                key={item.id}
                variants={itemVariants}
                className={cn(
                  "group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 px-3 -mx-3 rounded-2xl",
                  "transition-colors duration-150 hover:bg-gray-50/70 dark:hover:bg-zinc-800/40"
                )}
              >
                {/* Lado Esquerdo: Ícone e Detalhes do Evento */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  {/* Ícone de Tipo de Evento Padronizado */}
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl mt-0.5",
                      isAudiencia
                        ? "bg-[#FBF6E9] text-[#9A7A1A] border border-[#D4AF37]/25"
                        : "bg-gray-50 text-gray-600 border border-gray-200/60 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700"
                    )}
                  >
                    {isAudiencia ? (
                      <Gavel className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Clock className="h-4 w-4" aria-hidden="true" />
                    )}
                  </div>

                  {/* Textos e Metadados */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Urgency Pill Semântico Discreto */}
                      {urgency && <span
                        className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-tight",
                          urgency.pillClass
                        )}
                      >
                        {urgency.isPulsing ? (
                          <span className="relative flex h-2 w-2 mr-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                          </span>
                        ) : (
                          <span
                            className={cn(
                              "inline-flex rounded-full h-1.5 w-1.5 mr-1.5",
                              urgency.dotClass
                            )}
                          />
                        )}
                        {urgency.label}
                      </span>}

                      {/* Tipo Pill */}
                      <span className="text-[11px] font-normal text-gray-600 dark:text-zinc-400 bg-gray-100/80 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                        {isAudiencia ? "Audiência" : "Prazo Fatal"}
                      </span>

                      {/* Tribunal Pill Padronizado Sóbrio */}
                      {item.processo?.tribunal && (
                        <span className="bg-gray-100 text-gray-700 border border-gray-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 font-mono text-[11px] px-2 py-0.5 rounded-md uppercase">
                          {item.processo.tribunal}
                        </span>
                      )}

                      {/* Horário e Data */}
                      <span className="text-xs text-gray-400 dark:text-zinc-500 font-light">
                        · {formattedDate}
                      </span>
                    </div>

                    {/* Título do Prazo/Audiência */}
                    <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 truncate">
                      {item.titulo}
                    </h3>

                    {/* Subtítulo: Vara / Local / Videoconf */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-light text-gray-500 dark:text-zinc-400">
                      {item.processo?.vara && (
                        <span className="truncate max-w-[260px]">{item.processo.vara}</span>
                      )}

                      {item.local && (
                        <span className="inline-flex items-center gap-1 text-gray-500 dark:text-zinc-400 truncate">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {item.local}
                        </span>
                      )}

                      {videoconfHref && (
                        <a
                          href={videoconfHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#9A7A1A] dark:text-[#D4AF37] hover:underline font-bold"
                        >
                          <Video className="h-3 w-3 shrink-0" />
                          Acessar Sala Virtual
                        </a>
                      )}

                      {item.responsavel && (
                        <span className="text-gray-400 dark:text-zinc-500">
                          Resp: {item.responsavel}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lado Direito: Microinterações de CNJ e Navegação */}
                <div className="flex items-center gap-2 self-end sm:self-center pl-13 sm:pl-0 shrink-0">
                  {/* Botão Microinterativo para Copiar Número CNJ */}
                  {cnjDisplay && (
                    <button
                      type="button"
                      onClick={(e) => handleCopyCnj(e, cnjDisplay, item.id)}
                      title="Copiar número CNJ"
                      aria-label={`Copiar número CNJ ${cnjDisplay}`}
                      className={cn(
                        "group/btn inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono border transition-colors duration-150",
                        isCopied
                          ? "bg-[#FBF6E9] text-[#9A7A1A] border-[#D4AF37]/40"
                          : "bg-gray-50/80 hover:bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 border-gray-200/80 dark:border-zinc-700"
                      )}
                    >
                      {isCopied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-[#9A7A1A] animate-scale-in" />
                          <span className="text-[11px] font-sans font-bold text-[#9A7A1A]">
                            Copiado!
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="truncate max-w-[150px]">{cnjDisplay}</span>
                          <Copy className="h-3 w-3 text-gray-400 group-hover/btn:text-gray-600 dark:text-zinc-400 transition-colors" />
                        </>
                      )}
                    </button>
                  )}

                  {/* Link Direto para o Processo */}
                  {item.processo_id ? (
                    <Link
                      href={`/processos/${item.processo_id}`}
                      aria-label={`Acessar processo ${cnjDisplay ?? item.titulo}`}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100/70 hover:bg-gray-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors duration-150"
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-50 dark:bg-zinc-800 text-gray-300 dark:text-zinc-600 cursor-not-allowed">
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Footer Informativo */}
      <div className="mt-5 pt-3 border-t border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] font-light text-gray-400 dark:text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
          Contagem de prazos em dias úteis conforme CPC/15 e Resolução CNJ
        </span>
        <Link
          href="/agenda"
          className="text-gray-600 dark:text-zinc-300 hover:text-[#9A7A1A] dark:hover:text-[#D4AF37] font-bold transition-colors"
        >
          Ver pauta completa na Agenda →
        </Link>
      </div>
    </div>
  );
}
