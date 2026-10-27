"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: number;
  valueMesAnterior?: number;
  format?: "number" | "currency" | "count";
  icon: React.ComponentType<{ className?: string }>;
  color?: "gold" | "blue" | "green" | "red";
}

function formatValue(value: number, format: KPICardProps["format"]): string {
  if (format === "currency") {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
  return new Intl.NumberFormat("pt-BR").format(Math.round(value));
}

function CountUp({ value, format }: { value: number; format: KPICardProps["format"] }) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => formatValue(v, format));
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 1.2,
      ease: "easeOut",
    });
    return controls.stop;
  }, [value, motionValue]);

  return <motion.span ref={ref}>{rounded}</motion.span>;
}

export function KPICard({
  title,
  value,
  valueMesAnterior,
  format = "count",
  icon: Icon,
  color = "gold",
}: KPICardProps) {
  const delta =
    valueMesAnterior && valueMesAnterior > 0
      ? ((value - valueMesAnterior) / valueMesAnterior) * 100
      : null;

  const colorMap = {
    gold: "bg-gold-soft text-gold",
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    red: "bg-red-50 text-red-600",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm"
    >
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <div className={cn("p-2 rounded-lg", colorMap[color])}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>

      <p className="text-2xl font-bold text-gray-900">
        <CountUp value={value} format={format} />
      </p>

      {delta !== null && (
        <div className="mt-2 flex items-center gap-1">
          {delta > 0 ? (
            <TrendingUp className="h-3 w-3 text-emerald-500" />
          ) : delta < 0 ? (
            <TrendingDown className="h-3 w-3 text-red-400" />
          ) : (
            <Minus className="h-3 w-3 text-gray-300" />
          )}
          <span
            className={cn(
              "text-xs font-medium",
              delta > 0 ? "text-emerald-500" : delta < 0 ? "text-red-400" : "text-gray-400"
            )}
          >
            {delta > 0 ? "+" : ""}
            {delta.toFixed(1)}% vs mês anterior
          </span>
        </div>
      )}
    </motion.div>
  );
}
