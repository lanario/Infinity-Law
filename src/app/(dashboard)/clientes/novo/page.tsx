import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { ClienteForm } from "@/components/clientes/cliente-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Novo Cliente" };

export default async function NovoClientePage() {
  const supabase = createClient();
  const [{ data: canRead }, { data: canWrite }] = await Promise.all([
    supabase.rpc("has_permission", { modulo: "clientes", acao: "read" }),
    supabase.rpc("has_permission", { modulo: "clientes", acao: "write" }),
  ]);
  if (!canRead) redirect("/dashboard");

  return (
    <div>
      <Header title="Novo cliente" />
      <div className="p-4 sm:p-6">
        <ClienteForm canEdit={Boolean(canWrite)} />
      </div>
    </div>
  );
}
