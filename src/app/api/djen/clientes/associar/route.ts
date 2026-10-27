import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { verifyClientCandidate } from "@/lib/djen/client-candidate-token";
import { authorizeDjen } from "@/lib/djen/server-auth";
import { normalizeCnjNumber, toDjenDate, toSafeHttpUrl } from "@/lib/djen/validation";
import { persistManualAssociation } from "@/lib/djen/association-write";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const associationInputSchema = z.object({
  candidateToken: z.string().min(1).max(250_000),
  processoId: z.string().uuid(),
}).strict();

function publicationRow(
  item: NonNullable<ReturnType<typeof verifyClientCandidate>>["comunicacao"],
  escritorioId: string,
  processoId: string
) {
  return {
    escritorio_id: escritorioId,
    hash: item.hash,
    processo_id: processoId,
    numero_processo: item.numero_processo ?? null,
    numero_processo_com_mascara: item.numeroprocessocommascara ?? null,
    data_disponibilizacao: toDjenDate(item.data_disponibilizacao),
    tribunal: item.siglaTribunal ?? null,
    tipo_comunicacao: item.tipoComunicacao ?? null,
    orgao: item.nomeOrgao ?? null,
    texto: item.texto ?? null,
    meio: item.meio ?? null,
    meio_completo: item.meiocompleto ?? null,
    link: toSafeHttpUrl(item.link),
    tipo_documento: item.tipoDocumento ?? null,
    nome_classe: item.nomeClasse ?? null,
    codigo_classe: item.codigoClasse ?? null,
    numero_comunicacao:
      typeof item.numeroComunicacao === "number" && Number.isSafeInteger(item.numeroComunicacao)
        ? item.numeroComunicacao
        : null,
    comunicacao_ativa: item.ativo ?? null,
    destinatarios: item.destinatarios ?? [],
    // Campos arbitrários dos advogados destinatários não são carregados pelo token efêmero.
    destinatario_advogados: [],
  };
}

export async function POST(request: NextRequest) {
  const auth = await authorizeDjen("write");
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = associationInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados de associação inválidos." }, { status: 400 });
  }

  const candidate = verifyClientCandidate(parsed.data.candidateToken);
  if (!candidate) {
    return NextResponse.json(
      { error: "Este candidato expirou ou não pôde ser validado. Faça uma nova consulta." },
      { status: 400 }
    );
  }
  if (candidate.escritorioId !== auth.escritorioId) {
    return NextResponse.json({ error: "Candidato não encontrado neste escritório." }, { status: 404 });
  }

  const [clientPermission, processReadPermission, processWritePermission] = await Promise.all([
    auth.supabase.rpc("has_permission", { modulo: "clientes", acao: "read" }),
    auth.supabase.rpc("has_permission", { modulo: "processos", acao: "read" }),
    auth.supabase.rpc("has_permission", { modulo: "processos", acao: "write" }),
  ]);
  if (clientPermission.error || processReadPermission.error || processWritePermission.error) {
    return NextResponse.json({ error: "Não foi possível validar a permissão." }, { status: 500 });
  }
  if (!clientPermission.data) {
    return NextResponse.json({ error: "Sem permissão para consultar clientes." }, { status: 403 });
  }
  if (!processReadPermission.data || !processWritePermission.data) {
    return NextResponse.json({ error: "Sem permissão para associar publicações a processos." }, { status: 403 });
  }

  const item = candidate.comunicacao;
  const publicationNumber = normalizeCnjNumber(item.numero_processo);
  if (!publicationNumber) {
    return NextResponse.json(
      { error: "O resultado não tem um número CNJ válido para associação manual." },
      { status: 400 }
    );
  }

  try {
    const admin = createAdminClient();
    const [{ data: cliente, error: clienteError }, { data: processo, error: processoError }] = await Promise.all([
      admin
        .from("clientes")
        .select("id, nome")
        .eq("id", candidate.clienteId)
        .eq("escritorio_id", auth.escritorioId)
        .eq("ativo", true)
        .maybeSingle(),
      admin
        .from("processos")
        .select("id, numero_cnj")
        .eq("id", parsed.data.processoId)
        .eq("escritorio_id", auth.escritorioId)
        .maybeSingle(),
    ]);

    if (clienteError || processoError) {
      return NextResponse.json({ error: "Não foi possível validar o cliente e o processo." }, { status: 500 });
    }
    if (!cliente) {
      return NextResponse.json({ error: "O cliente selecionado não está mais disponível neste escritório." }, { status: 404 });
    }
    if (!processo) {
      return NextResponse.json({ error: "Processo não encontrado neste escritório." }, { status: 404 });
    }

    const { data: clientLink, error: clientLinkError } = await admin
      .from("processo_clientes")
      .select("processo_id")
      .eq("cliente_id", cliente.id)
      .eq("processo_id", processo.id)
      .maybeSingle();

    if (clientLinkError) {
      return NextResponse.json({ error: "Não foi possível validar o vínculo do cliente ao processo." }, { status: 500 });
    }
    if (!clientLink) {
      return NextResponse.json(
        { error: "Associe primeiro o cliente ao processo no cadastro interno." },
        { status: 400 }
      );
    }

    const processNumber = normalizeCnjNumber(processo.numero_cnj);
    if (!processNumber || processNumber !== publicationNumber) {
      return NextResponse.json(
        { error: "O número do processo selecionado não corresponde ao número CNJ da publicação." },
        { status: 400 }
      );
    }

    const row = publicationRow(item, auth.escritorioId, processo.id);
    const saved = await persistManualAssociation({
      async find() {
        const { data, error } = await admin
          .from("djen_publicacoes")
          .select("id, processo_id")
          .eq("escritorio_id", auth.escritorioId)
          .eq("hash", item.hash)
          .maybeSingle();
        if (error) throw error;
        return data ? { id: data.id, processoId: data.processo_id } : null;
      },
      async insert() {
        const { data, error } = await admin
          .from("djen_publicacoes")
          .insert(row)
          .select("id")
          .single();
        if (error?.code === "23505") return null;
        if (error) throw error;
        return data?.id ?? null;
      },
      async assignIfUnassigned(id) {
        const { data, error } = await admin
          .from("djen_publicacoes")
          .update(row)
          .eq("id", id)
          .eq("escritorio_id", auth.escritorioId)
          .eq("hash", item.hash)
          .is("processo_id", null)
          .select("id")
          .maybeSingle();
        if (error) throw error;
        return data?.id ?? null;
      },
    }, processo.id);

    if (saved.status === "conflict") {
      return NextResponse.json(
        { error: "Esta publicação foi associada simultaneamente a outro processo. Atualize a tela e revise o vínculo existente." },
        { status: 409 }
      );
    }

    if (saved.status === "inserted" || saved.status === "updated") {
      await logAudit({
        escritorioId: auth.escritorioId,
        usuarioId: auth.user.id,
        tabela: "djen_publicacoes",
        registroId: saved.id,
        acao: saved.status === "inserted" ? "insert" : "update",
        dadosNovos: { processo_id: processo.id, origem: "djen_busca_cliente_nome", associacao_manual: true },
      });
    }

    return NextResponse.json(
      {
        publicacaoId: saved.id,
        processoId: processo.id,
        numeroProcesso: processo.numero_cnj,
        clienteNome: cliente.nome,
        associadoManualmente: true,
      },
      { headers: { "cache-control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ error: "Não foi possível concluir a associação manual." }, { status: 500 });
  }
}
