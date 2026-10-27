"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useUser } from "@/components/layout/user-context";
import { Header } from "@/components/layout/header";

export interface DashboardHeaderRapportProps {
  title?: string;
  subtitle?: string;
  className?: string;
}

export function DashboardHeaderRapport({ title, subtitle, className }: DashboardHeaderRapportProps) {
  const user = useUser();

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const firstName = user?.nome?.split(" ")[0] ?? "Dr(a).";
  const rawDate = format(now, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
  const dateFormatted = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);

  return (
    <div className={className}>
      <Header title={title ?? `${greeting}, ${firstName}`} />
      <p className="sr-only">{subtitle ?? dateFormatted}</p>
    </div>
  );
}

export default DashboardHeaderRapport;
