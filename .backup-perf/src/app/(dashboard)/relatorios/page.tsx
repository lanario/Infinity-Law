import { Header } from "@/components/layout/header";
import { RelatoriosPanel } from "@/components/relatorios/relatorios-panel";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Relatórios" };

export default async function RelatoriosPage() {
  const supabase = createClient();
  const { data: canRead } = await supabase.rpc("has_permission", { modulo: "relatorios", acao: "read" });
  if (!canRead) redirect("/dashboard");
  return (
    <div>
      <Header title="Relatórios" />
      <div className="p-6">
        <RelatoriosPanel />
      </div>
    </div>
  );
}
