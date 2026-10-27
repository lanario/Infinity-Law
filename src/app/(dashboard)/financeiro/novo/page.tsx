import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { NovoHonorarioForm } from "@/components/financeiro/novo-honorario-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Novo Honorário" };

export default async function NovoHonorarioPage() {
  const supabase = createClient();
  const [{ data: canRead }, { data: canWrite }] = await Promise.all([
    supabase.rpc("has_permission", { modulo: "financeiro", acao: "read" }),
    supabase.rpc("has_permission", { modulo: "financeiro", acao: "write" }),
  ]);
  if (!canRead) redirect("/dashboard");
  if (!canWrite) redirect("/financeiro");

  const [{ data: clientes }, { data: processos }] = await Promise.all([
    supabase.from("clientes").select("id, nome").eq("ativo", true).order("nome").limit(500),
    supabase.from("processos").select("id, numero_cnj, tipo_acao").neq("status", "encerrado").order("created_at", { ascending: false }).limit(500),
  ]);

  return (
    <div>
      <Header title="Novo honorário" />
      <div className="p-4 sm:p-6">
        <NovoHonorarioForm clientes={clientes ?? []} processos={processos ?? []} />
      </div>
    </div>
  );
}
