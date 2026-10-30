"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion } from "framer-motion";
import { Scale, Sparkles } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

export interface CourtTrendDataPoint {
  label: string;
  honorarios: number;
  movimentacoes: number;
}

export interface CourtTrendsChartProps {
  data: CourtTrendDataPoint[];
  hasRecords: boolean;
  className?: string;
}

interface TooltipPayloadEntry {
  value: number;
  dataKey: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const receipts = payload.find((entry) => entry.dataKey === "honorarios")?.value ?? 0;
  const movements = payload.find((entry) => entry.dataKey === "movimentacoes")?.value ?? 0;

  return (
    <div className="min-w-48 rounded-xl border border-gray-200 bg-white p-3 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
      <p className="mb-2 text-xs font-bold text-gray-700 dark:text-zinc-300">{label}</p>
      <p className="text-xs text-gray-600 dark:text-zinc-400">Recebimentos: {formatCurrency(receipts)}</p>
      <p className="mt-1 text-xs text-gray-600 dark:text-zinc-400">Movimentações: {movements}</p>
    </div>
  );
}

export function CourtTrendsChart({ data, hasRecords, className }: CourtTrendsChartProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const root = document.documentElement;
    const syncTheme = () => setIsDark(root.classList.contains("dark"));
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const movementsStroke = isDark ? "#E4E4E7" : "#1F2937";
  const gridStroke = isDark ? "#27272A" : "#E5E7EB";
  const axisTickFill = isDark ? "#A1A1AA" : "#9CA3AF";

  const totals = useMemo(
    () =>
      data.reduce(
        (sum, point) => ({
          receipts: sum.receipts + point.honorarios,
          movements: sum.movements + point.movimentacoes,
        }),
        { receipts: 0, movements: 0 }
      ),
    [data]
  );
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900",
        className
      )}
    >
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100">
            Recebimentos e movimentações
          </h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
            Dados registrados nos últimos 30 dias
          </p>
        </div>
        <span className="w-fit rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          Últimos 30 dias
        </span>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FBF6E9] text-[#9A7A1A] dark:bg-[#D4AF37]/15 dark:text-[#D4AF37]">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[11px] text-gray-500 dark:text-zinc-400">Recebimentos</p>
            <p className="text-sm font-bold text-gray-900 dark:text-zinc-100">
              {formatCurrency(totals.receipts)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-200/70 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300">
            <Scale className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[11px] text-gray-500 dark:text-zinc-400">Movimentações</p>
            <p className="text-sm font-bold text-gray-900 dark:text-zinc-100">
              {totals.movements} {totals.movements === 1 ? "registro" : "registros"}
            </p>
          </div>
        </div>
      </div>

      <div className="h-64 w-full">
        {!hasRecords ? (
          <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 px-5 text-center dark:border-zinc-700">
            <p className="text-sm font-semibold text-gray-700 dark:text-zinc-300">
              Ainda não há dados para este período
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
              Recebimentos e movimentações serão exibidos quando forem registrados.
            </p>
            <div className="mt-3 flex gap-4 text-xs font-bold">
              <Link href="/financeiro" className="text-[#9A7A1A] hover:underline dark:text-[#D4AF37]">
                Ver financeiro
              </Link>
              <Link href="/processos" className="text-gray-700 hover:underline dark:text-zinc-300">
                Ver processos
              </Link>
            </div>
          </div>
        ) : !isMounted ? (
          <div className="h-full animate-pulse rounded-xl bg-gray-100/70 dark:bg-zinc-800/40" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 12, right: 10, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="dashboardReceipts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="dashboardMovements" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={movementsStroke} stopOpacity={isDark ? 0.18 : 0.1} />
                  <stop offset="95%" stopColor={movementsStroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} strokeOpacity={isDark ? 0.7 : 0.5} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: axisTickFill }} dy={6} />
              <YAxis
                yAxisId="receipts"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: axisTickFill }}
                tickFormatter={(value: number) => (value >= 1000 ? `${Math.round(value / 1000)}k` : `${value}`)}
              />
              <YAxis yAxisId="movements" orientation="right" hide />
              <Tooltip content={<CustomTooltip />} />
              <Area
                yAxisId="receipts"
                type="monotone"
                dataKey="honorarios"
                stroke="#D4AF37"
                strokeWidth={2.4}
                fill="url(#dashboardReceipts)"
                name="Recebimentos"
              />
              <Area
                yAxisId="movements"
                type="monotone"
                dataKey="movimentacoes"
                stroke={movementsStroke}
                strokeWidth={2.2}
                fill="url(#dashboardMovements)"
                name="Movimentações"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.section>
  );
}

export default CourtTrendsChart;
