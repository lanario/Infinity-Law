import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { CalendarView } from "@/components/agenda/calendar-view";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { failedQueryOperations, logQueryFailures } from "@/lib/server/query-error-state.mjs";
import { getAgendaDateKey } from "@/lib/agenda/team-timeline.mjs";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Agenda" };

export default async function AgendaPage() {
  const supabase = createClient();

  const now = new Date();
  const startRange = new Date(now.getFullYear() - 2, 0, 1).toISOString();
  const endRange = new Date(now.getFullYear() + 3, 0, 1).toISOString();

  const [readPermission, writePermission, deletePermission] = await Promise.all([
    supabase.rpc("has_permission", { modulo: "agenda", acao: "read" }),
    supabase.rpc("has_permission", { modulo: "agenda", acao: "write" }),
    supabase.rpc("has_permission", { modulo: "agenda", acao: "delete" }),
  ]);
  const permissionResults = [
    { operation: "agenda-read-permission", error: readPermission.error },
    { operation: "agenda-write-permission", error: writePermission.error },
    { operation: "agenda-delete-permission", error: deletePermission.error },
  ];
  if (failedQueryOperations(permissionResults).length > 0) {
    logQueryFailures("AgendaPage", permissionResults);
    return (
      <div>
        <Header title="Agenda" />
        <div className="p-4 sm:p-6"><QueryErrorState retryHref="/agenda" /></div>
      </div>
    );
  }
  const canRead = readPermission.data;
  if (!canRead) redirect("/dashboard");

  const [eventosResult, clientesResult, processosResult, membrosResult] = await Promise.all([
    supabase
      .from("eventos")
      .select("id, titulo, tipo, inicio, fim, dia_inteiro, processo_id, cliente_id, responsavel_id, descricao, local, link_videoconf")
      .gte("inicio", startRange)
      .lt("inicio", endRange)
      .order("inicio")
      .limit(1500),
    supabase.from("clientes").select("id, nome").eq("ativo", true).order("nome").limit(500),
    supabase.from("processos").select("id, numero_cnj, tipo_acao").order("created_at", { ascending: false }).limit(500),
    // RLS limits this query to the active user's office; only display fields are transferred.
    supabase.from("usuarios").select("id, nome, avatar_url, ativo").order("nome").limit(500),
  ]);

  const dataResults = [
    { operation: "agenda-eventos", error: eventosResult.error },
    { operation: "agenda-clientes", error: clientesResult.error },
    { operation: "agenda-processos", error: processosResult.error },
    { operation: "agenda-membros", error: membrosResult.error },
  ];
  if (failedQueryOperations(dataResults).length > 0) {
    logQueryFailures("AgendaPage", dataResults);
    return (
      <div>
        <Header title="Agenda" />
        <div className="p-4 sm:p-6"><QueryErrorState retryHref="/agenda" /></div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Agenda" />
      <div className="p-4 sm:p-6">
        <CalendarView
          initialEventos={eventosResult.data ?? []}
          clientes={clientesResult.data ?? []}
          processos={processosResult.data ?? []}
          membros={membrosResult.data ?? []}
          initialDateKey={getAgendaDateKey(now)}
          canWrite={Boolean(writePermission.data)}
          canDelete={Boolean(deletePermission.data)}
        />
      </div>
    </div>
  );
}
