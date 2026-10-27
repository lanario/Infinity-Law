import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { UserProvider } from "@/components/layout/user-context";
import { PerformanceModeProvider } from "@/components/layout/performance-mode-context";
import type { ProfileSex, UserWithPermissions, PermissionsMap } from "@/types/permissions";

export default async function DashboardLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Busca dados do usuário + cargo + permissões
  const { data: usuarioData, error: usuarioError } = await supabase
    .from("usuarios")
    .select(`
      id,
      nome,
      email,
      avatar_url,
      escritorio_id,
      cargo_id,
      cargos!usuarios_cargo_tenant_fkey (
        nome,
        is_admin,
        permissoes
      )
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (usuarioError) {
    throw usuarioError;
  }

  if (!usuarioData) {
    // Usuário autenticado mas sem registro em usuarios — faz logout para evitar loop
    await supabase.auth.signOut();
    redirect("/login");
  }

  const { data: dadosPessoais, error: dadosPessoaisError } = await supabase
    .from("perfis_dados_pessoais")
    .select("data_nascimento, sexo, cpf, telefone")
    .eq("usuario_id", user.id)
    .maybeSingle();

  if (dadosPessoaisError) {
    throw dadosPessoaisError;
  }

  const cargo = Array.isArray(usuarioData.cargos)
    ? usuarioData.cargos[0]
    : usuarioData.cargos;
  const savedAvatar = ((usuarioData.avatar_url as string | null) || null);
  const isLegacyAvatarUrl = Boolean(savedAvatar && /^https?:\/\//i.test(savedAvatar));

  const userWithPermissions: UserWithPermissions = {
    id: usuarioData.id,
    nome: usuarioData.nome,
    email: usuarioData.email,
    avatar_url: isLegacyAvatarUrl ? savedAvatar : null,
    avatar_path: savedAvatar && !isLegacyAvatarUrl ? savedAvatar : null,
    data_nascimento: dadosPessoais?.data_nascimento ?? null,
    sexo: (dadosPessoais?.sexo as ProfileSex | null | undefined) ?? null,
    cpf: dadosPessoais?.cpf ?? null,
    telefone: dadosPessoais?.telefone ?? null,
    escritorio_id: usuarioData.escritorio_id,
    cargo_id: usuarioData.cargo_id,
    cargo_nome: cargo?.nome ?? null,
    is_admin: cargo?.is_admin ?? false,
    permissoes: (cargo?.permissoes as PermissionsMap) ?? {},
  };

  return (
    <UserProvider user={userWithPermissions}>
      <PerformanceModeProvider>
        <DashboardShell>
          {children}
          {modal}
        </DashboardShell>
      </PerformanceModeProvider>
    </UserProvider>
  );
}
