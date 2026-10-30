import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type DjenPermissionAction = "read" | "write" | "delete";

export async function authorizeDjen(action: DjenPermissionAction) {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Não foi possível validar a sessão." }, { status: 401 }),
    };
  }

  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Não autenticado." }, { status: 401 }),
    };
  }

  const { data: hasPermission, error: permissionError } = await supabase.rpc("has_permission", {
    modulo: "comunicacao",
    acao: action,
  });

  if (permissionError) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Não foi possível validar a permissão." }, { status: 500 }),
    };
  }

  if (!hasPermission) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Sem permissão para esta operação." }, { status: 403 }),
    };
  }

  const { data: escritorioId, error: escritorioError } = await supabase.rpc("my_escritorio_id");

  if (escritorioError || !escritorioId) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Escritório não encontrado." }, { status: 403 }),
    };
  }

  return {
    ok: true as const,
    supabase,
    user,
    escritorioId: String(escritorioId),
  };
}
