"use client";

import { Users, Briefcase, DollarSign, AlertTriangle, CalendarClock } from "lucide-react";
import { KPICard } from "./kpi-card";
import type { DashboardKPIs } from "@/types/domain";

interface KPIGridProps {
  kpis: DashboardKPIs;
}

export function KPIGrid({ kpis }: KPIGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      <KPICard
        title="Clientes Ativos"
        value={kpis.totalClientes}
        format="count"
        icon={Users}
        color="gold"
      />
      <KPICard
        title="Processos Ativos"
        value={kpis.processosAtivos}
        format="count"
        icon={Briefcase}
        color="blue"
      />
      <KPICard
        title="Honorários a Receber"
        value={kpis.honorariosAReceber}
        format="currency"
        icon={DollarSign}
        color="green"
      />
      <KPICard
        title="Prazos nas próximas 48h"
        value={kpis.prazosCriticos}
        format="count"
        icon={AlertTriangle}
        color="red"
      />
      <KPICard
        title="Audiências em 7 dias"
        value={kpis.audienciasSemana}
        format="count"
        icon={CalendarClock}
        color="blue"
      />
    </div>
  );
}
