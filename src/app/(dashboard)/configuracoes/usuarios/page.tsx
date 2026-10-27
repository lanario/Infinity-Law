import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { UsuariosPanel } from "@/components/configuracoes/usuarios-panel";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Usuários" };

export default async function UsuariosPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Verifica permissão server-side
  const { data: hasPermission } = await supabase.rpc("has_permission", {
    modulo: "configuracoes",
    acao: "read",
  });

  if (!hasPermission) {
    redirect("/dashboard");
  }

  const [{ data: canWrite }, { data: usuarios }, { data: cargos }] = await Promise.all([
    supabase.rpc("has_permission", { modulo: "configuracoes", acao: "write" }),
    supabase
      .from("usuarios")
      .select("id, nome, email, ativo, cargo_id, cargos!usuarios_cargo_tenant_fkey(nome)")
      .order("nome"),
    supabase.from("cargos").select("id, nome, is_admin, permissoes").order("nome"),
  ]);

  return (
    <div>
      <Header title="Usuários & Cargos" />
      <div className="p-6">
        <UsuariosPanel usuarios={usuarios ?? []} cargos={cargos ?? []} currentUserId={user?.id ?? ""} canWrite={Boolean(canWrite)} />
      </div>
    </div>
  );
}
