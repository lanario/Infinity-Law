"use client";

import { useState, useEffect, useMemo } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface LegalAreaDistributionItem {
  id: string | number;
  nome: string;
  processos: number;
  cor: string;
  porcentagem?: number;
}

export interface AreasDistributionCardProps {
  className?: string;
  title?: string;
  subtitle?: string;
  data: LegalAreaDistributionItem[];
  totalAtivos?: number;
}

const EXECUTIVE_PALETTE = [
  "#17191A", // Grafite Profundo / Ink
  "#D4AF37", // Dourado Institucional
  "#8B6914", // Bronze / Ouro Escuro
  "#6B7280", // Cinza Executivo
  "#D1D5DB", // Prata / Cinza Claro
] as const;

interface TooltipPayloadEntry {
  value: number;
  name: string;
  color: string;
  payload: LegalAreaDistributionItem & { porcentagemCalculada: number };
}

interface CustomDonutTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}

function CustomDonutTooltip({ active, payload }: CustomDonutTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const item = payload[0];
  if (!item) return null;

  const data = item.payload;

  return (
    <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-gray-200/80 dark:border-zinc-800 rounded-2xl p-3 shadow-xl min-w-[170px]">
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: data.cor }}
        />
        <span className="text-xs font-bold text-gray-900 dark:text-zinc-100">
          {data.nome}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-zinc-300">
        <span>Processos</span>
        <span className="font-bold tabular-nums text-gray-900 dark:text-zinc-100">
          {data.processos} ({data.porcentagemCalculada.toFixed(1)}%)
        </span>
      </div>
    </div>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
};

export function AreasDistributionCard({
  className,
  title = "Distribuição por Carteira",
  subtitle = "Composição de processos ativos por área do direito",
  data,
  totalAtivos,
}: AreasDistributionCardProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const totalCalculado = useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.processos, 0);
  }, [data]);

  const total = totalAtivos ?? totalCalculado;

  const enrichedData = useMemo(() => {
    const legacyRainbowColors = new Set(["#10b981", "#f59e0b", "#6366f1", "#8b5cf6", "#3b82f6"]);
    return data.map((item, idx) => {
      const pct = total > 0 ? (item.processos / total) * 100 : 0;
      const normalizedColor = legacyRainbowColors.has(item.cor.toLowerCase())
        ? EXECUTIVE_PALETTE[idx % EXECUTIVE_PALETTE.length]
        : item.cor;
      return {
        ...item,
        cor: normalizedColor,
        porcentagemCalculada: item.porcentagem ?? pct,
      };
    });
  }, [data, total]);

  const activeItem =
    activeIndex !== null && activeIndex >= 0 && activeIndex < enrichedData.length
      ? enrichedData[activeIndex]
      : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative overflow-hidden flex flex-col justify-between",
        "bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-sm p-6",
        className
      )}
    >
      {/* Header */}
      <div className="relative z-10 flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100">
              {title}
            </h2>
          </div>
          <p className="text-xs font-light text-gray-500 dark:text-zinc-400">
            {subtitle}
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 border border-gray-200/80 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-xs font-normal">
          <Briefcase className="w-3.5 h-3.5 text-[#9A7A1A] dark:text-[#D4AF37]" />
          <span className="tabular-nums">{data.length} áreas</span>
        </div>
      </div>

      {/* Donut Chart & Center Counter */}
      {data.length === 0 ? (
        <div className="my-2 flex h-52 flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 px-5 text-center dark:border-zinc-700">
          <p className="text-sm font-semibold text-gray-700 dark:text-zinc-300">
            Ainda não há processos ativos por área
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
            A distribuição aparece quando houver processos ativos associados a uma área.
          </p>
          <Link
            href="/processos/novo"
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#9A7A1A] hover:underline dark:text-[#D4AF37]"
          >
            Cadastrar processo
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <div className="relative my-2 h-52 w-full flex items-center justify-center">
          {!isMounted ? (
          <div className="h-44 w-44 rounded-full border-8 border-gray-100 dark:border-zinc-800 animate-pulse" />
          ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={enrichedData}
                  cx="50%"
                  cy="50%"
                  innerRadius={68}
                  outerRadius={92}
                  paddingAngle={4}
                  cornerRadius={6}
                  dataKey="processos"
                  nameKey="nome"
                  stroke="transparent"
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {enrichedData.map((entry, index) => {
                    const isSelected = activeIndex === index;
                    const isAnyHovered = activeIndex !== null;
                    return (
                      <Cell
                        key={`cell-${entry.id}`}
                        fill={entry.cor}
                        opacity={!isAnyHovered || isSelected ? 1 : 0.35}
                        className="transition-opacity duration-200 cursor-pointer"
                      />
                    );
                  })}
                </Pie>
                <Tooltip content={<CustomDonutTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Central Badge in Donut */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeItem ? activeItem.id : "total"}
                  initial={{ opacity: 0, scale: 0.92, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -4 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="flex flex-col items-center justify-center text-center px-2"
                >
                  <span className="text-3xl font-bold tracking-tight text-gray-900 dark:text-zinc-100 tabular-nums">
                    {activeItem ? activeItem.processos : total}
                  </span>
                  <span className="text-[11px] font-light uppercase tracking-wider text-gray-500 dark:text-zinc-400 mt-0.5 truncate max-w-[120px]">
                    {activeItem ? activeItem.nome : "Processos Ativos"}
                  </span>
                </motion.div>
              </AnimatePresence>
            </div>
          </>
          )}
        </div>
      )}

      {/* Interactive Legend with Staggered Framer Motion */}
      {data.length > 0 && <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mt-4 space-y-1.5"
      >
        {enrichedData.map((item, index) => {
          const isSelected = activeIndex === index;
          return (
            <motion.div
              key={item.id}
              variants={itemVariants}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              className={cn(
                "group flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all duration-200",
                isSelected
                  ? "bg-gray-100/80 dark:bg-zinc-800/60 border border-gray-200/80 dark:border-zinc-700 shadow-sm"
                  : "hover:bg-gray-50/80 dark:hover:bg-zinc-800/30 border border-transparent"
              )}
            >
              {/* Bullet and Title */}
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full transition-transform duration-200 shrink-0",
                    isSelected ? "scale-125" : ""
                  )}
                  style={{
                    backgroundColor: item.cor,
                  }}
                  aria-hidden="true"
                />
                <span
                  className={cn(
                    "text-xs sm:text-sm font-normal truncate transition-colors",
                    isSelected
                      ? "text-gray-900 dark:text-zinc-100 font-bold"
                      : "text-gray-700 dark:text-zinc-300 group-hover:text-gray-900 dark:group-hover:text-zinc-100"
                  )}
                >
                  {item.nome}
                </span>
              </div>

              {/* Metrics */}
              <div className="flex items-center gap-2.5 flex-shrink-0">
                <span className="text-xs font-light text-gray-500 dark:text-zinc-400 tabular-nums">
                  {item.processos} {item.processos === 1 ? "proc." : "procs."}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300 font-bold tabular-nums">
                  {item.porcentagemCalculada.toFixed(1)}%
                </span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>}

      {/* Subtle Insight Footnote */}
      {data.length > 0 && <div className="mt-4 pt-3 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-gray-500 dark:text-zinc-400">
        <span className="font-light">Carteira predominante:</span>
        <span className="font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-0.5">
          {enrichedData[0]?.nome} ({enrichedData[0]?.porcentagemCalculada.toFixed(1)}%)
          <ArrowUpRight className="w-3 h-3 text-[#9A7A1A] dark:text-[#D4AF37]" />
        </span>
      </div>}
    </motion.div>
  );
}

export default AreasDistributionCard;
