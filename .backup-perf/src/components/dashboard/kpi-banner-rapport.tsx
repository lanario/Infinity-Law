"use client";

import { useEffect, useState } from "react";
import { animate, motion } from "framer-motion";
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

export interface KPIBannerRapportData {
  honorariosAReceber: number;
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
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(0, value, {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: setDisplayValue,
    });
    return () => controls.stop();
  }, [value]);

  const formatted = currency
    ? new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(displayValue)
    : new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(
        Math.round(displayValue)
      );

  return <span className="tabular-nums">{formatted}</span>;
}

export function KPIBannerRapport({ kpis, className }: KPIBannerRapportProps) {
  const cards = [
    {
      key: "honorarios",
      label: "Honorários a receber",
      value: kpis.honorariosAReceber,
      currency: true,
      detail: "Parcelas pendentes ou vencidas",
      empty: "Nenhum valor pendente ou vencido.",
      href: "/financeiro",
      action: "Ver financeiro",
      icon: DollarSign,
    },
    {
      key: "processos",
      label: "Processos ativos",
      value: kpis.processosAtivos,
      currency: false,
      detail: "Processos com status ativo",
      empty: "Ainda não há processos ativos.",
      href: "/processos/novo",
      action: "Cadastrar processo",
      icon: Briefcase,
    },
    {
      key: "prazos",
      label: "Prazos próximos de 48h",
      value: kpis.prazosCriticos,
      currency: false,
      detail: `Hoje: ${kpis.prazosHoje} · Amanhã: ${kpis.prazosAmanha}`,
      empty: "Ainda não há prazos neste período.",
      href: "/agenda?novo=prazo",
      action: "Cadastrar prazo",
      icon: AlertTriangle,
    },
    {
      key: "audiencias",
      label: "Audiências em 7 dias",
      value: kpis.audienciasSemana,
      currency: false,
      detail: `Amanhã: ${kpis.audienciasAmanha} · Com link virtual: ${kpis.audienciasVirtuais}`,
      empty: "Ainda não há audiências neste período.",
      href: "/agenda?novo=audiencia",
      action: "Agendar audiência",
      icon: CalendarClock,
    },
    {
      key: "clientes",
      label: "Clientes ativos",
      value: kpis.totalClientes,
      currency: false,
      detail: "Clientes com cadastro ativo",
      empty: "Ainda não há clientes ativos.",
      href: "/clientes?novo=true",
      action: "Cadastrar cliente",
      icon: Users,
    },
  ];

  return (
    <div
      className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4", className)}
      aria-label="Indicadores do escritório"
    >
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <motion.article
            key={card.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.04 }}
            className="flex min-h-48 flex-col rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37]/20 bg-[#FBF6E9] text-[#9A7A1A] dark:bg-[#D4AF37]/10 dark:text-[#D4AF37]">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                {card.label}
              </h2>
            </div>

            <p className="mt-4 text-2xl font-black leading-none text-gray-900 dark:text-zinc-100">
              <CountUpNumber value={card.value} currency={card.currency} />
            </p>
            <p className="mt-2 text-xs text-gray-500 dark:text-zinc-400">{card.detail}</p>
            {card.value === 0 && (
              <p className="mt-2 text-xs text-gray-500 dark:text-zinc-400">{card.empty}</p>
            )}

            <Link
              href={card.href}
              className="mt-auto inline-flex items-center gap-1 pt-4 text-xs font-bold text-gray-700 hover:text-[#9A7A1A] dark:text-zinc-300 dark:hover:text-[#D4AF37]"
            >
              {card.action}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </motion.article>
        );
      })}
    </div>
  );
}

export default KPIBannerRapport;
