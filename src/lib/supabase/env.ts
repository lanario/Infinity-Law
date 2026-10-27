// Lê as variáveis públicas do Supabase com erro claro quando faltam (NEXT_PUBLIC_* são embutidas no build).
export function getSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    const faltando = [!url && "NEXT_PUBLIC_SUPABASE_URL", !anonKey && "NEXT_PUBLIC_SUPABASE_ANON_KEY"]
      .filter(Boolean)
      .join(", ");
    // Marcador reconhecido por src/lib/auth-errors.ts.
    throw new Error(`SUPABASE_ENV_AUSENTE: variáveis ausentes: ${faltando}. Configure-as e refaça o build.`);
  }

  return { url, anonKey };
}
