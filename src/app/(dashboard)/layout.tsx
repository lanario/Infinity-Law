import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getSessionUser } from "@/lib/server/current-profile";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { UserProvider } from "@/components/layout/user-context";
import { PerformanceModeProvider } from "@/components/layout/performance-mode-context";
import { ThemeProvider } from "@/components/layout/theme-context";
import type { ProfileSex, UserWithPermissions, PermissionsMap } from "@/types/permissions";

export default async function DashboardLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = createClient();
  // Consultas independentes após getUser: rodam em paralelo (perfil é cacheado por request).
  const [profile, { data: dadosPessoais, error: dadosPessoaisError }] = await Promise.all([
    getCurrentProfile(),
    supabase
      .from("perfis_dados_pessoais")
      .select("data_nascimento, sexo, cpf, telefone")
      .eq("usuario_id", user.id)
      .maybeSingle(),
  ]);

  if (!profile) {
    // Usuário autenticado mas sem registro em usuarios — faz logout para evitar loop
    await supabase.auth.signOut();
    redirect("/login");
  }

  if (dadosPessoaisError) {
    throw dadosPessoaisError;
  }

  const { usuario: usuarioData, cargo } = profile;
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
      <ThemeProvider>
        <PerformanceModeProvider>
          <DashboardShell>
            {children}
            {modal}
          </DashboardShell>
        </PerformanceModeProvider>
      </ThemeProvider>
    </UserProvider>
  );
}
