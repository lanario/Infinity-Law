import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { ConfiguracoesWorkspace } from "@/components/configuracoes/configuracoes-workspace";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const supabase = createClient();
  const [{ data: { user } }, { data: canRead }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc("has_permission", { modulo: "configuracoes", acao: "read" }),
  ]);

  if (!canRead) redirect("/dashboard");

  const [
    { data: profile },
    { data: canWrite },
    { data: usuarios },
    { data: cargos },
  ] = await Promise.all([
    user
      ? supabase.from("usuarios").select("nome, email, ativo, cargo_id").eq("id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.rpc("has_permission", { modulo: "configuracoes", acao: "write" }),
    supabase
      .from("usuarios")
      .select("id, nome, email, ativo, cargo_id, cargos!usuarios_cargo_tenant_fkey(nome)")
      .order("nome"),
    supabase.from("cargos").select("id, nome, is_admin, permissoes").order("nome"),
  ]);

  const cargo = profile?.cargo_id
    ? cargos?.find((item) => item.id === profile.cargo_id)
    : undefined;

  return (
    <div>
      <Header title="Configurações" />
      <div className="space-y-5 p-4 sm:p-6">
        <ConfiguracoesWorkspace
          profile={{
            name: profile?.nome ?? user?.email ?? "Usuário",
            email: profile?.email ?? user?.email ?? "—",
            role: cargo?.nome ?? "Sem cargo",
            active: profile?.ativo ?? false,
            isAdmin: cargo?.is_admin ?? false,
          }}
          usuarios={usuarios ?? []}
          cargos={cargos ?? []}
          currentUserId={user?.id ?? ""}
          canWrite={Boolean(canWrite)}
        />
      </div>
    </div>
  );
}
