import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { ConfiguracoesWorkspace } from "@/components/configuracoes/configuracoes-workspace";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/server/current-profile";

export const metadata: Metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const supabase = createClient();
  const [currentProfile, { data: usuarios }, { data: cargos }] = await Promise.all([
    getCurrentProfile(),
    supabase
      .from("usuarios")
      .select("id, nome, email, ativo, cargo_id, cargos!usuarios_cargo_tenant_fkey(nome)")
      .order("nome"),
    supabase.from("cargos").select("id, nome, is_admin, permissoes").order("nome"),
  ]);

  if (!currentProfile) redirect("/login");
  if (!currentProfile.can("configuracoes", "read")) redirect("/dashboard");

  const user = currentProfile.user;
  const profile = currentProfile.usuario;
  const canWrite = currentProfile.can("configuracoes", "write");

  const cargo = profile?.cargo_id
    ? cargos?.find((item) => item.id === profile.cargo_id)
    : undefined;

  return (
    <div>
      <Header title="Configurações" />
      <div className="space-y-5 p-4 sm:p-6">
        <ConfiguracoesWorkspace
          profile={{
            name: profile?.nome ?? user.email ?? "Usuário",
            email: profile?.email ?? user.email ?? "—",
            role: cargo?.nome ?? "Sem cargo",
            active: profile?.ativo ?? false,
            isAdmin: cargo?.is_admin ?? false,
          }}
          usuarios={usuarios ?? []}
          cargos={cargos ?? []}
          currentUserId={user.id ?? ""}
          canWrite={canWrite}
        />
      </div>
    </div>
  );
}
