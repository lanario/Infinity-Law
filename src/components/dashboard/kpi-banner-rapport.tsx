"use client";

import { motion, useReducedMotion, useReducedMotionConfig } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  Briefcase,
  CalendarClock,
  DollarSign,
  Users,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const kpiContainerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05 },
  },
};

const kpiCardVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: "easeOut" },
  },
};

export interface KPIBannerRapportData {
  honorariosAReceber: number;
  honorariosPendentes?: number;
  honorariosVencidos?: number;
  variacaoPercentual?: number;
  comparativoMesLabel?: string;
  sparklinePoints?: number[];
  processosAtivos: number;
  prazosCriticos: number;
  prazosHoje: number;
  prazosAmanha: number;
  audienciasSemana: number;
  audienciasAmanha: number;
  audienciasVirtuais: number;
  totalClientes: number;
}

export interface KPIBannerRapportProps {
  kpis: KPIBannerRapportData;
  className?: string;
}

function CountUpNumber({ value, currency = false }: { value: number; currency?: boolean }) {
  const formatted = currency
    ? new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value)
    : new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(Math.round(value));

  return <span className="tabular-nums">{formatted}</span>;
}

export type SparklineTrend = "up" | "down" | "flat";

export interface SparklineProps {
  points?: number[];
  trend?: SparklineTrend;
  isPositive?: boolean;
  variacaoPercentual?: number;
  className?: string;
}

export function Sparkline({
  points,
  trend: propTrend,
  isPositive,
  variacaoPercentual,
  className,
}: SparklineProps) {
  const trend: SparklineTrend =
    propTrend ??
    (variacaoPercentual !== undefined
      ? variacaoPercentual > 0
        ? "up"
        : variacaoPercentual < 0
        ? "down"
        : "flat"
      : isPositive !== undefined
      ? isPositive
        ? "up"
        : "down"
      : "flat");

  const defaultPoints =
    trend === "up"
      ? [28, 30, 29, 34, 33, 40, 38, 52]
      : trend === "down"
      ? [52, 48, 50, 42, 43, 34, 36, 28]
      : [38, 38, 38, 38, 38, 38, 38, 38];
  const validPoints = points && points.length >= 2 ? points : defaultPoints;

  const width = 120;
  const height = 38;
  const paddingX = 8;
  const paddingY = 8;
  const usableW = width - paddingX * 2;
  const usableH = height - paddingY * 2;

  const minVal = Math.min(...validPoints);
  const maxVal = Math.max(...validPoints);
  const isFlat = trend === "flat" || maxVal === minVal;

  let d: string;
  let lastPoint: { x: number; y: number };

  if (isFlat) {
    d = `M ${paddingX} ${height / 2} L ${width - paddingX} ${height / 2}`;
    lastPoint = { x: width - paddingX, y: height / 2 };
  } else {
    const coords: Array<{ x: number; y: number }> = validPoints.map((val, idx) => {
      const x = paddingX + (idx / (validPoints.length - 1)) * usableW;
      const y = height - paddingY - ((val - minVal) / (maxVal - minVal)) * usableH;
      return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
    });

    const firstPoint = coords[0] ?? { x: paddingX, y: height / 2 };
    lastPoint = coords[coords.length - 1] ?? { x: width - paddingX, y: height / 2 };

    d = `M ${firstPoint.x} ${firstPoint.y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i === 0 ? 0 : i - 1] ?? firstPoint;
      const p1 = coords[i] ?? firstPoint;
      const p2 = coords[i + 1] ?? lastPoint;
      const p3 = coords[i + 2 < coords.length ? i + 2 : coords.length - 1] ?? lastPoint;
      const cp1x = Number((p1.x + (p2.x - p0.x) * 0.18).toFixed(1));
      const cp1y = Number((p1.y + (p2.y - p0.y) * 0.18).toFixed(1));
      const cp2x = Number((p2.x - (p3.x - p1.x) * 0.18).toFixed(1));
      const cp2y = Number((p2.y - (p3.y - p1.y) * 0.18).toFixed(1));
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
  }

  const strokeColorClass =
    trend === "up"
      ? "stroke-[#059669] dark:stroke-[#10B981]"
      : trend === "down"
      ? "stroke-[#EF4444] dark:stroke-[#F43F5E]"
      : "stroke-[#D4AF37] dark:stroke-[#D4AF37]";

  const fillColorClass =
    trend === "up"
      ? "fill-[#059669] dark:fill-[#10B981]"
      : trend === "down"
      ? "fill-[#EF4444] dark:fill-[#F43F5E]"
      : "fill-[#D4AF37] dark:fill-[#D4AF37]";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("overflow-visible", className)}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={d}
        fill="none"
        className={strokeColorClass}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Ponto terminal iluminado no final da linha */}
      <circle
        cx={lastPoint.x}
        cy={lastPoint.y}
        r="7"
        className={fillColorClass}
        opacity="0.25"
      />
      <circle
        cx={lastPoint.x}
        cy={lastPoint.y}
        r="3.5"
        className={fillColorClass}
      />
    </svg>
  );
}

export function KPIBannerRapport({ kpis, className }: KPIBannerRapportProps) {
  const reducedMotionConfig = useReducedMotionConfig();
  const prefersReducedMotion = useReducedMotion();
  const shouldReduceMotion = reducedMotionConfig === true || prefersReducedMotion === true;

  const honorariosVencidos = kpis.honorariosVencidos ?? 0;
  const honorariosPendentes =
    kpis.honorariosPendentes ?? Math.max(0, kpis.honorariosAReceber - honorariosVencidos);

  const variacaoPercentual = kpis.variacaoPercentual ?? 0;
  const trend: SparklineTrend =
    variacaoPercentual > 0 ? "up" : variacaoPercentual < 0 ? "down" : "flat";
  const isPositive = variacaoPercentual > 0;
  const sinal = variacaoPercentual > 0 ? "+" : "";
  const variacaoTexto = `${sinal}${variacaoPercentual.toFixed(1)}%`;
  const comparativoLabel = kpis.comparativoMesLabel ?? "vs mês anterior";

  const satelliteCards = [
    {
      key: "processos",
      label: "Processos ativos",
      value: kpis.processosAtivos,
      trend: kpis.processosAtivos > 0 ? "+3.1%" : "+0%",
      detail: "Processos com status ativo",
      empty: "Ainda não há processos ativos.",
      href: "/processos/novo",
      action: "+ Cadastrar",
      icon: Briefcase,
    },
    {
      key: "clientes",
      label: "Clientes ativos",
      value: kpis.totalClientes,
      trend: kpis.totalClientes > 0 ? "+2.4%" : "+0%",
      detail: "Clientes com cadastro ativo",
      empty: "Ainda não há clientes ativos.",
      href: "/clientes?novo=true",
      action: "+ Cadastrar",
      icon: Users,
    },
    {
      key: "prazos",
      label: "Prazos próximos de 48h",
      value: kpis.prazosCriticos,
      trend: kpis.prazosCriticos > 0 ? "+0.4 pt" : "+0%",
      detail: `Hoje: ${kpis.prazosHoje} · Amanhã: ${kpis.prazosAmanha}`,
      empty: "Ainda não há prazos neste período.",
      href: "/agenda?novo=prazo",
      action: "+ Cadastrar",
      icon: AlertTriangle,
    },
    {
      key: "audiencias",
      label: "Audiências em 7 dias",
      value: kpis.audienciasSemana,
      trend: kpis.audienciasSemana > 0 ? "+1.8%" : "+0%",
      detail: `Amanhã: ${kpis.audienciasAmanha} · Com link virtual: ${kpis.audienciasVirtuais}`,
      empty: "Ainda não há audiências neste período.",
      href: "/agenda?novo=audiencia",
      action: "Agendar",
      icon: CalendarClock,
    },
  ];

  return (
    <motion.section
      className={cn("grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch", className)}
      aria-label="Indicadores do escritório"
      variants={kpiContainerVariants}
      initial={shouldReduceMotion ? false : "hidden"}
      animate="visible"
    >
      {/* Card Primário (Hero Card - Honorários a Receber) */}
      <motion.article
        variants={kpiCardVariants}
        className="lg:col-span-5 xl:col-span-5 flex flex-col justify-between rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 relative overflow-hidden group hover:border-[#D4AF37]/50 transition-all duration-300"
      >
        {/* Topo */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37]/20 bg-[#FBF6E9] text-[#9A7A1A] dark:bg-[#D4AF37]/10 dark:text-[#D4AF37]">
              <DollarSign className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
              HONORÁRIOS A RECEBER
            </h2>
          </div>
          <Link
            href="/financeiro"
            className="inline-flex items-center gap-1 text-xs font-bold text-gray-600 hover:text-[#9A7A1A] dark:text-zinc-400 dark:hover:text-[#D4AF37] transition-colors"
          >
            Ver financeiro
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        {/* Meio: Valor em destaque + Micro-gráfico Sparkline */}
        <div className="my-5 flex items-center justify-between gap-4 flex-1">
          <div className="min-w-0">
            <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-zinc-100 tabular-nums">
              <CountUpNumber value={kpis.honorariosAReceber} currency />
            </p>
            <p
              className={cn(
                "mt-1.5 text-xs font-semibold flex items-center gap-1",
                trend === "up" && "text-emerald-600 dark:text-emerald-400",
                trend === "down" && "text-rose-600 dark:text-rose-400",
                trend === "flat" && "text-[#9A7A1A] dark:text-[#D4AF37]"
              )}
            >
              <span>{variacaoTexto}</span>
              <span className="font-normal text-gray-500 dark:text-zinc-400">
                {comparativoLabel}
              </span>
            </p>
          </div>
          <div className="shrink-0 flex items-center justify-end">
            <Sparkline
              points={kpis.sparklinePoints}
              trend={trend}
              variacaoPercentual={kpis.variacaoPercentual}
              isPositive={isPositive}
              className="w-28 sm:w-36 h-10"
            />
          </div>
        </div>

        {/* Base: Sub-métricas executivas */}
        <div className="border-t border-gray-100 dark:border-zinc-800/80 pt-4 mt-auto grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-zinc-400">A vencer</p>
            <p className="text-base sm:text-lg font-bold text-gray-800 dark:text-zinc-200 tabular-nums mt-0.5">
              <CountUpNumber value={honorariosPendentes} currency />
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-zinc-400">Em atraso</p>
            <p
              className={cn(
                "text-base sm:text-lg font-bold tabular-nums mt-0.5",
                honorariosVencidos > 0
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-gray-800 dark:text-zinc-200"
              )}
            >
              <CountUpNumber value={honorariosVencidos} currency />
            </p>
          </div>
        </div>
      </motion.article>

      {/* Container dos Cards Satélites (4 cards ao redor) */}
      <div className="lg:col-span-7 xl:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
        {satelliteCards.map((card) => {
          const Icon = card.icon;
          return (
            <motion.article
              key={card.key}
              variants={kpiCardVariants}
              className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between hover:border-[#D4AF37]/40 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37]/20 bg-[#FBF6E9] text-[#9A7A1A] dark:bg-[#D4AF37]/10 dark:text-[#D4AF37]">
                    <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                  </div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 truncate">
                    {card.label}
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 tabular-nums">
                    {card.trend}
                  </span>
                  <Link
                    href={card.href}
                    title={card.action}
                    aria-label={`${card.action} - ${card.label}`}
                    className="rounded-full p-1 text-gray-400 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors inline-flex items-center justify-center"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>

              <div className="my-auto py-2">
                <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-zinc-100 tabular-nums">
                  <CountUpNumber value={card.value} />
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">{card.detail}</p>
                {card.value === 0 && (
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">{card.empty}</p>
                )}
              </div>
            </motion.article>
          );
        })}
      </div>
    </motion.section>
  );
}

export default KPIBannerRapport;
