import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { FinanceiroSummary } from "@/components/financeiro/financeiro-summary";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/server/current-profile";
import { failedQueryOperations, logQueryFailures } from "@/lib/server/query-error-state.mjs";

export const metadata: Metadata = { title: "Financeiro" };

function dateInSaoPaulo() {
  const values = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: "year" | "month" | "day") => values.find((item) => item.type === type)?.value ?? "00";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export default async function FinanceiroPage({ searchParams }: { searchParams?: { mes?: string } }) {
  const supabase = createClient();
  const hoje = dateInSaoPaulo();
  const mes = searchParams?.mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(searchParams.mes)
    ? searchParams.mes
    : hoje.slice(0, 7);
  const year = Number(mes.slice(0, 4));
  const month = Number(mes.slice(5, 7));
  const inicio = `${mes}-01`;
  const fim = `${mes}-${String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, "0")}`;

  const [profile, parcelasResult, movimentacoesResult, honorariosResult, clientesResult] = await Promise.all([
    getCurrentProfile().catch((error) => {
      console.error("[FinanceiroPage] Falha ao carregar perfil:", error);
      return "error" as const;
    }),
    supabase
      .from("parcelas")
      .select(`
        id,
        numero_parcela,
        valor,
        vencimento,
        status,
        data_pagamento,
        honorarios!parcelas_honorario_id_fkey (
          tipo,
          clientes!honorarios_cliente_id_fkey (nome)
        )
      `)
      .in("status", ["pendente", "vencido", "pago"])
      .gte("vencimento", inicio)
      .lte("vencimento", fim)
      .order("vencimento", { ascending: true })
      .limit(500),
    supabase
      .from("lancamentos_financeiros")
      .select("id, tipo, descricao, categoria, valor, vencimento, status, data_pagamento, cliente_id, clientes!lancamentos_financeiros_cliente_id_fkey(nome)")
      .neq("status", "cancelado")
      .gte("vencimento", inicio)
      .lte("vencimento", fim)
      .order("vencimento", { ascending: true })
      .limit(500),
    supabase
      .from("honorarios")
      .select("id, tipo, status, descricao, valor_fixo, percentual_exito, base_calculo_exito, processo_id, clientes!honorarios_cliente_id_fkey(id, nome), processos!honorarios_processo_id_fkey(id, numero_cnj)", { count: "exact" })
      .eq("status", "ativo")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("clientes").select("id, nome").eq("ativo", true).order("nome").limit(500),
  ]);

  if (profile === "error") {
    return <div><Header title="Financeiro" /><div className="p-4 sm:p-6"><QueryErrorState retryHref="/financeiro" /></div></div>;
  }
  if (!profile) redirect("/login");
  if (!profile.can("financeiro", "read")) redirect("/dashboard");

  const queryResults = [
    { operation: "financeiro-parcelas", error: parcelasResult.error },
    { operation: "financeiro-lancamentos", error: movimentacoesResult.error },
    { operation: "financeiro-honorarios", error: honorariosResult.error },
    { operation: "financeiro-clientes", error: clientesResult.error },
  ];
  if (failedQueryOperations(queryResults).length > 0) {
    logQueryFailures("FinanceiroPage", queryResults);
    return <div><Header title="Financeiro" /><div className="p-4 sm:p-6"><QueryErrorState retryHref="/financeiro" /></div></div>;
  }

  return (
    <div>
      <Header title="Financeiro" />
      <div className="p-4 sm:p-6">
        <FinanceiroSummary
          parcelas={parcelasResult.data ?? []}
          movimentacoes={movimentacoesResult.data ?? []}
          honorarios={honorariosResult.data ?? []}
          totalHonorarios={honorariosResult.count ?? (honorariosResult.data ?? []).length}
          clientes={clientesResult.data ?? []}
          mes={mes}
          hoje={hoje}
          canWrite={profile.can("financeiro", "write")}
        />
      </div>
    </div>
  );
}
