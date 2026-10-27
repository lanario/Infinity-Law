"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DashboardKPIs } from "@/types/domain";

export function useDashboardKPIs(initialData: DashboardKPIs) {
  const [kpis, setKPIs] = useState<DashboardKPIs>(initialData);

  useEffect(() => {
    const supabase = createClient();

    const refreshCounts = async () => {
      const [clientsRes, processesRes] = await Promise.all([
        supabase
          .from("clientes")
          .select("id", { count: "exact", head: true })
          .eq("ativo", true),
        supabase
          .from("processos")
          .select("id", { count: "exact", head: true })
          .eq("status", "ativo"),
      ]);

      if (clientsRes.error || processesRes.error) {
        console.error("Falha ao atualizar indicadores do dashboard", {
          clientes: clientsRes.error,
          processos: processesRes.error,
        });
        return;
      }

      setKPIs((previous) => ({
        ...previous,
        totalClientes: clientsRes.count ?? 0,
        processosAtivos: processesRes.count ?? 0,
      }));
    };

    // Atualiza as contagens sob RLS quando os registros do escritório mudarem.
    const channel = supabase
      .channel("dashboard-kpis")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clientes" },
        () => void refreshCounts()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "processos" },
        () => void refreshCounts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return kpis;
}
