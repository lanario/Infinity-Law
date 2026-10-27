import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeDjen } from "@/lib/djen/server-auth";

export const dynamic = "force-dynamic";

const clienteIdSchema = z.string().uuid();
const PAGE_SIZE = 100;

export async function GET(request: NextRequest) {
  const auth = await authorizeDjen("read");
  if (!auth.ok) return auth.response;

  const [clientPermission, processPermission] = await Promise.all([
    auth.supabase.rpc("has_permission", { modulo: "clientes", acao: "read" }),
    auth.supabase.rpc("has_permission", { modulo: "processos", acao: "read" }),
  ]);
  if (clientPermission.error || processPermission.error) {
    return NextResponse.json({ error: "Não foi possível validar a permissão." }, { status: 500 });
  }
  if (!clientPermission.data) {
    return NextResponse.json({ error: "Sem permissão para consultar clientes." }, { status: 403 });
  }
  if (!processPermission.data) {
    return NextResponse.json({ error: "Sem permissão para consultar processos." }, { status: 403 });
  }

  const clienteId = request.nextUrl.searchParams.get("clienteId") ?? "";
  if (!clienteIdSchema.safeParse(clienteId).success) {
    return NextResponse.json({ error: "Cliente inválido." }, { status: 400 });
  }
  const rawOffset = request.nextUrl.searchParams.get("offset") ?? "0";
  const offset = Number(rawOffset);
  if (!Number.isSafeInteger(offset) || offset < 0 || offset % PAGE_SIZE !== 0) {
    return NextResponse.json({ error: "Página de processos inválida." }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { data: cliente, error: clienteError } = await admin
      .from("clientes")
      .select("id")
      .eq("id", clienteId)
      .eq("escritorio_id", auth.escritorioId)
      .eq("ativo", true)
      .maybeSingle();

    if (clienteError) {
      return NextResponse.json({ error: "Não foi possível consultar os processos do cliente." }, { status: 500 });
    }
    if (!cliente) {
      return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    }

    const { data: processos, error: processosError } = await admin
      .from("processos")
      .select("id, numero_cnj, processo_clientes!inner(cliente_id)")
      .eq("escritorio_id", auth.escritorioId)
      .eq("processo_clientes.cliente_id", clienteId)
      .order("numero_cnj", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE);

    if (processosError) {
      return NextResponse.json({ error: "Não foi possível consultar os processos do cliente." }, { status: 500 });
    }

    const rows = processos ?? [];
    return NextResponse.json({
      processos: rows.slice(0, PAGE_SIZE).map(({ id, numero_cnj }) => ({ id, numero_cnj })),
      proximoOffset: rows.length > PAGE_SIZE ? offset + PAGE_SIZE : null,
    }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Não foi possível consultar os processos do cliente." }, { status: 500 });
  }
}
