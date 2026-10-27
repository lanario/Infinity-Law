import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeDjen } from "@/lib/djen/server-auth";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

function maskDocument(value: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (digits.length === 11) return `***.***.***-${digits.slice(-2)}`;
  if (digits.length === 14) return `**.***.***/****-${digits.slice(-2)}`;
  return null;
}

export async function GET(request: NextRequest) {
  const auth = await authorizeDjen("read");
  if (!auth.ok) return auth.response;

  const { data: canReadClients, error: permissionError } = await auth.supabase.rpc(
    "has_permission",
    { modulo: "clientes", acao: "read" }
  );
  if (permissionError) {
    return NextResponse.json({ error: "Não foi possível validar a permissão." }, { status: 500 });
  }
  if (!canReadClients) {
    return NextResponse.json({ error: "Sem permissão para consultar clientes." }, { status: 403 });
  }

  const rawOffset = request.nextUrl.searchParams.get("offset") ?? "0";
  const offset = Number(rawOffset);
  if (!Number.isSafeInteger(offset) || offset < 0 || offset % PAGE_SIZE !== 0) {
    return NextResponse.json({ error: "Página de clientes inválida." }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("clientes")
      .select("id, nome, tipo, cpf_cnpj")
      .eq("escritorio_id", auth.escritorioId)
      .eq("ativo", true)
      .order("nome", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE);

    if (error) {
      return NextResponse.json(
        { error: "Não foi possível carregar os clientes deste escritório." },
        { status: 500, headers: { "cache-control": "no-store" } }
      );
    }

    const rows = data ?? [];
    const clientes = rows.slice(0, PAGE_SIZE).map((cliente) => ({
      id: cliente.id,
      nome: cliente.nome,
      tipo: cliente.tipo,
      documentoMascarado: maskDocument(cliente.cpf_cnpj),
    }));

    return NextResponse.json(
      { clientes, proximoOffset: rows.length > PAGE_SIZE ? offset + PAGE_SIZE : null },
      { headers: { "cache-control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Não foi possível carregar os clientes deste escritório." },
      { status: 500, headers: { "cache-control": "no-store" } }
    );
  }
}
