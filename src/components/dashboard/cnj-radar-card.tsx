"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  Radio,
  Copy,
  Check,
  FileText,
  Newspaper,
  FileCheck2,
  Scale,
  ArrowUpRight,
} from "lucide-react";
import { cn, formatCNJ } from "@/lib/utils";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface RadarMovementItem {
  id: string;
  processo_id?: string | null;
  numero_cnj: string;
  tribunal: string; // e.g. "TJSP", "TRF-3", "TRT-2", "TST", "STJ"
  tipo: "despacho" | "publicacao" | "juntada" | "sentenca" | "audiencia" | "certidao" | string;
  titulo: string;
  resumo: string;
  data_hora: string; // ISO string
  isNovo?: boolean;
  fonte?: string; // "DataJud (CNJ)", "DJEN", "PJe", "e-SAJ"
  grau?: string;
}

export interface CnjRadarCardProps {
  movements?: RadarMovementItem[];
  className?: string;
  title?: string;
  subtitle?: string;
}

const EMPTY_MOVEMENTS: RadarMovementItem[] = [];

// Helper de estilização padronizada para o badge de tribunal
function getTribunalBadge(_tribunal: string) {
  return "bg-gray-100 text-gray-700 border border-gray-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 font-mono text-[11px]";
}

// Helper para ícone e cor padronizada por tipo de movimentação
function getMovementIcon(tipo: string) {
  const t = tipo.toLowerCase();
  if (t.includes("publicacao") || t.includes("djen") || t.includes("diario")) {
    return {
      icon: Newspaper,
      style: "bg-[#FBF6E9] text-[#9A7A1A] border border-[#D4AF37]/25",
    };
  }
  if (t.includes("despacho") || t.includes("decisao")) {
    return {
      icon: FileText,
      style: "bg-gray-50 text-gray-600 border border-gray-200/60 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
    };
  }
  if (t.includes("juntada") || t.includes("peticao")) {
    return {
      icon: FileCheck2,
      style: "bg-gray-50 text-gray-600 border border-gray-200/60 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
    };
  }
  if (t.includes("sentenca") || t.includes("acordao")) {
    return {
      icon: Scale,
      style: "bg-[#FBF6E9] text-[#9A7A1A] border border-[#D4AF37]/25",
    };
  }
  return {
    icon: Activity,
    style: "bg-gray-50 text-gray-600 border border-gray-200/60 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
  };
}

// Formata timestamp relativo em pt-BR ("há 18min", "há 2h", etc.)
function formatRelativeTime(dateIso: string): string {
  try {
    const date = parseISO(dateIso);
    return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
  } catch {
    return "recente";
  }
}

export function CnjRadarCard({
  movements,
  className,
  title = "Movimentações dos processos",
  subtitle = "Registros recentes dos processos do escritório",
}: CnjRadarCardProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedTribunal, setSelectedTribunal] = useState<string>("TODOS");

  const feedMovements = movements ?? EMPTY_MOVEMENTS;

  // Extrai tribunais únicos para filtro rápido
  const uniqueTribunals = useMemo(() => {
    const set = new Set<string>();
    feedMovements.forEach((m) => set.add(m.tribunal.toUpperCase()));
    return ["TODOS", ...Array.from(set)];
  }, [feedMovements]);

  // Filtra por tribunal caso selecionado
  const filteredMovements = useMemo(() => {
    if (selectedTribunal === "TODOS") return feedMovements;
    return feedMovements.filter((m) => m.tribunal.toUpperCase() === selectedTribunal);
  }, [feedMovements, selectedTribunal]);

  // Microinteração para copiar o número CNJ
  const handleCopyCnj = async (e: React.MouseEvent, cnjRaw: string, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(cnjRaw.trim());
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
      {/* Título e Filtro de Tribunais */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-gray-100 dark:border-zinc-800">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
            <Radio className="h-4 w-4 text-[#9A7A1A] dark:text-[#D4AF37]" />
            {title}
          </h2>
          <p className="text-xs font-light text-gray-500 dark:text-zinc-400 mt-0.5">
            {subtitle}
          </p>
        </div>

        {/* Chips de Tribunal Padronizados */}
        <div className="flex flex-wrap items-center gap-1.5">
          {uniqueTribunals.map((trib) => (
            <button
              key={trib}
              type="button"
              onClick={() => setSelectedTribunal(trib)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors duration-150 border",
                selectedTribunal === trib
                  ? "bg-[#17191A] text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent shadow-xs"
                  : "bg-gray-100 hover:bg-gray-200/70 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 border-gray-200 dark:border-zinc-700"
              )}
            >
              {trib}
            </button>
          ))}
        </div>
      </div>

      {/* Feed de Movimentações com Framer Motion */}
      {filteredMovements.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm font-bold text-gray-600 dark:text-zinc-400">
          {feedMovements.length === 0
            ? "Ainda não há movimentações registradas"
            : "Nenhuma movimentação para o tribunal selecionado"}
          </p>
          <p className="text-xs font-light text-gray-400 dark:text-zinc-500 mt-1">
            As movimentações serão exibidas quando forem registradas em um processo.
          </p>
          {feedMovements.length === 0 && (
            <Link
              href="/processos/novo"
              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#9A7A1A] hover:underline dark:text-[#D4AF37]"
            >
              Cadastrar processo
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>
      ) : (
        <motion.div
          key={selectedTribunal}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="divide-y divide-gray-100 dark:divide-zinc-800 mt-4"
        >
          {filteredMovements.map((item) => {
            const relativeTime = formatRelativeTime(item.data_hora);
            const { icon: MovementIcon, style: iconStyle } = getMovementIcon(item.tipo);
            const tribunalStyle = getTribunalBadge(item.tribunal);
            const cnjDisplay = formatCNJ(item.numero_cnj);
            const isCopied = copiedId === item.id;

            return (
              <motion.div
                key={item.id}
                variants={itemVariants}
                className={cn(
                  "group relative flex flex-col gap-3 py-4 px-3 -mx-3 rounded-2xl",
                  "transition-colors duration-150 hover:bg-gray-50/70 dark:hover:bg-zinc-800/40"
                )}
              >
                {/* Linha Superior: Tribunal, Timestamp e Badges */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Badge do Tribunal Padronizado */}
                    <span
                      className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-md uppercase",
                        tribunalStyle
                      )}
                    >
                      {item.tribunal}
                    </span>

                    {/* Badge de Novo Andamento */}
                    {item.isNovo && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FBF6E9] text-[#9A7A1A] border border-[#D4AF37]/30">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
                        Novo
                      </span>
                    )}

                    {/* Grau da Jurisdição */}
                    {item.grau && (
                      <span className="text-[11px] text-gray-500 dark:text-zinc-400 font-light">
                        {item.grau}
                      </span>
                    )}

                    {/* Fonte de Coleta */}
                    {item.fonte && (
                      <span className="text-[10px] text-gray-500 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md hidden sm:inline">
                        {item.fonte}
                      </span>
                    )}
                  </div>

                  {/* Timestamp Relativo */}
                  <span className="text-xs font-light text-gray-500 dark:text-zinc-400 shrink-0">
                    {relativeTime}
                  </span>
                </div>

                {/* Conteúdo Central: Ícone, Resumo da Movimentação e Título */}
                <div className="flex items-start gap-3.5">
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl mt-0.5",
                      iconStyle
                    )}
                  >
                    <MovementIcon className="h-4 w-4" aria-hidden="true" />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 truncate">
                      {item.titulo}
                    </h3>
                    <p className="text-xs font-light text-gray-600 dark:text-zinc-300 leading-relaxed line-clamp-2">
                      {item.resumo}
                    </p>
                  </div>
                </div>

                {/* Linha Inferior: Microinteração de Copiar CNJ e Link do Processo */}
                <div className="flex items-center justify-between gap-3 pt-1 border-t border-gray-100/60 dark:border-zinc-800/60">
                  {/* Botão Copiar CNJ */}
                  <button
                    type="button"
                    onClick={(e) => handleCopyCnj(e, cnjDisplay, item.id)}
                    title="Copiar número CNJ"
                    aria-label={`Copiar número CNJ ${cnjDisplay}`}
                    className={cn(
                      "group/btn inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono border transition-colors duration-150",
                      isCopied
                        ? "bg-[#FBF6E9] text-[#9A7A1A] border-[#D4AF37]/40"
                        : "bg-gray-50 hover:bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 border-gray-200/60 dark:border-zinc-700"
                    )}
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-3 w-3 text-[#9A7A1A]" />
                        <span className="text-[11px] font-sans font-bold text-[#9A7A1A]">
                          CNJ copiado!
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="truncate max-w-[200px]">{cnjDisplay}</span>
                        <Copy className="h-3 w-3 text-gray-400 group-hover/btn:text-gray-600 dark:text-zinc-400" />
                      </>
                    )}
                  </button>

                  {/* Acesso ao Detalhe do Processo */}
                  {item.processo_id ? (
                    <Link
                      href={`/processos/${item.processo_id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-gray-700 hover:text-[#9A7A1A] dark:text-zinc-300 dark:hover:text-[#D4AF37] transition-colors"
                    >
                      <span>Abrir processo</span>
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  ) : (
                    <span className="text-xs font-light text-gray-400 dark:text-zinc-600">
                      Processo em triagem
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Footer */}
      <div className="mt-5 pt-3 border-t border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] font-light text-gray-400 dark:text-zinc-500">
        <span className="flex items-center gap-1.5">
          Movimentações consultadas no cadastro de processos do escritório
        </span>
        <Link
          href="/processos"
          className="text-gray-600 dark:text-zinc-300 hover:text-[#9A7A1A] dark:hover:text-[#D4AF37] font-bold transition-colors"
        >
          Ver processos →
        </Link>
      </div>
    </div>
  );
}
