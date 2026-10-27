import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { ClienteTableWrapper } from "@/components/clientes/cliente-table-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { failedQueryOperations, logQueryFailures } from "@/lib/server/query-error-state.mjs";
import type { Metadata } from "next";
import type { ClienteComProcessos } from "@/types/domain";

export const metadata: Metadata = { title: "Clientes" };

async function getClientes(search: string, cursor: string | null, status: string, limit = 20) {
  const supabase = createClient();

  let query = supabase
    .from("clientes")
    .select("*, processos_count:processo_clientes(count)")
    .order("nome")
    .limit(limit + 1);

  if (status === "ativos") query = query.eq("ativo", true);
  if (status === "arquivados") query = query.eq("ativo", false);

  if (search) {
    query = query.ilike("nome", `%${search}%`);
  }

  if (cursor) {
    query = query.gt("nome", cursor);
  }

  const { data, error } = await query;
  if (error) return { ok: false as const, error };

  const rows = (data ?? []) as ClienteComProcessos[];
  const hasMore = rows.length > limit;
  const pageData = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? pageData[pageData.length - 1]?.nome ?? null : null;

  return { ok: true as const, data: pageData, nextCursor, hasMore };
}

interface PageProps {
  searchParams: { search?: string; cursor?: string; status?: string };
}

export default async function ClientesPage({ searchParams }: PageProps) {
  const params = searchParams;
  const search = params.search ?? "";
  const cursor = params.cursor ?? null;
  const status = ["todos", "ativos", "arquivados"].includes(params.status ?? "")
    ? params.status!
    : "ativos";
  const supabase = createClient();
  const { data: canRead, error: readPermissionError } = await supabase.rpc("has_permission", {
    modulo: "clientes",
    acao: "read",
  });
  if (readPermissionError) {
    logQueryFailures("ClientesPage", [{ operation: "clientes-read-permission", error: readPermissionError }]);
    return (
      <div>
        <Header title="Clientes" />
        <div className="p-4 sm:p-6"><QueryErrorState retryHref="/clientes" /></div>
      </div>
    );
  }
  if (!canRead) redirect("/dashboard");

  const [page, totalResult, pfResult, pjResult, writePermissionResult] = await Promise.all([
    getClientes(search, cursor, status),
    supabase.from("clientes").select("id", { count: "exact", head: true }),
    supabase.from("clientes").select("id", { count: "exact", head: true }).eq("tipo", "pf"),
    supabase.from("clientes").select("id", { count: "exact", head: true }).eq("tipo", "pj"),
    supabase.rpc("has_permission", { modulo: "clientes", acao: "write" }),
  ]);

  if (!page.ok) {
    logQueryFailures("ClientesPage", [{ operation: "clientes-list", error: page.error }]);
    return (
      <div>
        <Header title="Clientes" />
        <div className="p-4 sm:p-6"><QueryErrorState retryHref="/clientes" /></div>
      </div>
    );
  }

  const queryResults = [
    { operation: "clientes-total-count", error: totalResult.error },
    { operation: "clientes-pf-count", error: pfResult.error },
    { operation: "clientes-pj-count", error: pjResult.error },
    { operation: "clientes-write-permission", error: writePermissionResult.error },
  ];
  if (failedQueryOperations(queryResults).length > 0) {
    logQueryFailures("ClientesPage", queryResults);
    return (
      <div>
        <Header title="Clientes" />
        <div className="p-4 sm:p-6"><QueryErrorState retryHref="/clientes" /></div>
      </div>
    );
  }

  const { data: clientes, nextCursor, hasMore } = page;

  return (
    <div>
      <Header title="Clientes" />
      <div className="p-4 sm:p-6">
        <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
          <ClienteTableWrapper
            initialData={clientes}
            nextCursor={nextCursor}
            hasMore={hasMore}
            currentSearch={search}
            currentStatus={status}
            canCreate={Boolean(writePermissionResult.data)}
            stats={{
              total: totalResult.count ?? 0,
              pessoaFisica: pfResult.count ?? 0,
              pessoaJuridica: pjResult.count ?? 0,
            }}
          />
        </Suspense>
      </div>
    </div>
  );
}
