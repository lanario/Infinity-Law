import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signClientCandidate } from "@/lib/djen/client-candidate-token";
import { authorizeDjen } from "@/lib/djen/server-auth";
import {
  clientCandidateCommunicationSchema,
  clientSearchInputSchema,
  getSaoPauloDate,
  parseDjenResponse,
  toSafeHttpUrl,
  validateDateRange,
} from "@/lib/djen/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CNJ_COMMUNICATIONS_URL = "https://comunicaapi.pje.jus.br/api/v1/comunicacao";
const MAX_VISIBLE_CANDIDATES = 50;

export async function POST(request: NextRequest) {
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

  const body = await request.json().catch(() => null);
  const parsed = clientSearchInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Informe um cliente e um período válidos." },
      { status: 400, headers: { "cache-control": "no-store" } }
    );
  }

  const rangeError = validateDateRange(
    parsed.data.dataInicio,
    parsed.data.dataFim,
    getSaoPauloDate()
  );
  if (rangeError) {
    return NextResponse.json(
      { error: rangeError },
      { status: 400, headers: { "cache-control": "no-store" } }
    );
  }

  try {
    const admin = createAdminClient();
    const { data: cliente, error: clienteError } = await admin
      .from("clientes")
      .select("id, nome")
      .eq("id", parsed.data.clienteId)
      .eq("escritorio_id", auth.escritorioId)
      .eq("ativo", true)
      .maybeSingle();

    if (clienteError) {
      return NextResponse.json(
        { error: "Não foi possível validar o cliente selecionado." },
        { status: 500, headers: { "cache-control": "no-store" } }
      );
    }
    if (!cliente) {
      return NextResponse.json(
        { error: "Cliente não encontrado neste escritório." },
        { status: 404, headers: { "cache-control": "no-store" } }
      );
    }

    const nomeParte = typeof cliente.nome === "string" ? cliente.nome.trim() : "";
    if (nomeParte.length < 2 || nomeParte.length > 300) {
      return NextResponse.json(
        { error: "O nome cadastrado precisa ter entre 2 e 300 caracteres para consulta." },
        { status: 400, headers: { "cache-control": "no-store" } }
      );
    }

    const url = new URL(CNJ_COMMUNICATIONS_URL);
    // Somente o nome da parte e as datas saem do servidor para o CNJ.
    url.searchParams.set("nomeParte", nomeParte);
    url.searchParams.set("dataDisponibilizacaoInicio", parsed.data.dataInicio);
    url.searchParams.set("dataDisponibilizacaoFim", parsed.data.dataFim);

    let upstream: Response;
    try {
      upstream = await fetch(url, {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
        headers: { accept: "application/json" },
      });
    } catch {
      return NextResponse.json(
        { error: "Não foi possível consultar o DJEN. Tente novamente mais tarde." },
        { status: 502, headers: { "cache-control": "no-store" } }
      );
    }

    if (upstream.status === 429) {
      const retryAfter = upstream.headers.get("retry-after");
      return NextResponse.json(
        {
          error: "O CNJ limitou as consultas neste momento. Aguarde antes de tentar novamente.",
          waitSeconds: retryAfter && /^\d+$/.test(retryAfter) ? Number(retryAfter) : null,
        },
        { status: 429, headers: { "cache-control": "no-store" } }
      );
    }
    if (!upstream.ok) {
      return NextResponse.json(
        { error: "O DJEN não concluiu a consulta. Tente novamente mais tarde." },
        { status: 502, headers: { "cache-control": "no-store" } }
      );
    }

    let payload: unknown;
    try {
      payload = await upstream.json();
    } catch {
      return NextResponse.json(
        { error: "O DJEN retornou uma resposta inválida." },
        { status: 502, headers: { "cache-control": "no-store" } }
      );
    }

    let response;
    try {
      response = parseDjenResponse(payload);
    } catch {
      return NextResponse.json(
        { error: "Não foi possível validar a resposta do DJEN." },
        { status: 502, headers: { "cache-control": "no-store" } }
      );
    }

    const uniqueItems = Array.from(
      new Map(response.items.map((item) => [item.hash, item])).values()
    );
    const consultaId = randomUUID();
    const candidates = uniqueItems.slice(0, MAX_VISIBLE_CANDIDATES).map((item) => {
      const comunicacao = clientCandidateCommunicationSchema.parse({
        ...item,
        link: toSafeHttpUrl(item.link),
      });
      const candidateToken = signClientCandidate({
        consultaId,
        escritorioId: auth.escritorioId,
        clienteId: cliente.id,
        nomeParteConsultado: nomeParte,
        dataInicio: parsed.data.dataInicio,
        dataFim: parsed.data.dataFim,
        comunicacao,
      });

      return {
        token: candidateToken,
        associacaoDisponivel: candidateToken !== null,
        comunicacao,
      };
    });

    return NextResponse.json(
      {
        consultaId,
        totalCount: response.count,
        uniqueCount: uniqueItems.length,
        candidateCount: candidates.length,
        truncated: uniqueItems.length > MAX_VISIBLE_CANDIDATES,
        semResultados: uniqueItems.length === 0,
        candidates,
      },
      { headers: { "cache-control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Não foi possível concluir a busca no DJEN." },
      { status: 500, headers: { "cache-control": "no-store" } }
    );
  }
}
