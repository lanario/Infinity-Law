import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  let env: ReturnType<typeof getSupabaseEnv>;
  try {
    env = getSupabaseEnv();
  } catch (err) {
    // Sem Supabase não há sessão: registra o motivo e não deixa rotas protegidas abertas.
    console.error("[middleware]", err instanceof Error ? err.message : err);
    const { pathname } = request.nextUrl;
    if (pathname === "/" || pathname === "/login" || pathname === "/signup" || pathname === "/esqueci-senha") return supabaseResponse;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const supabase = createServerClient(
    env.url,
    env.anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            supabaseResponse.cookies.set(name, value, options as any)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPasswordRecoveryRoute = pathname === "/recuperar-senha";
  const isAuthRoute = pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/register" ||
    pathname === "/esqueci-senha" ||
    pathname === "/forgot-password" ||
    isPasswordRecoveryRoute;

  // A landing (/) é pública para visitantes e usuários logados.
  if (!user && !isAuthRoute && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // A sessão criada pelo link de recuperação é necessária para concluir a troca
  // de senha; não redirecione esse callback para o dashboard.
  if (user && isAuthRoute && !isPasswordRecoveryRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
