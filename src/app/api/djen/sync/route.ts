import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeDjen } from "@/lib/djen/server-auth";
import {
  getSaoPauloDate,
  normalizeCnjNumber,
  parseDjenResponse,
  syncInputSchema,
  toDjenDate,
  toSafeHttpUrl,
  validateDateRange,
  type DjenCommunication,
} from "@/lib/djen/validation";

const CNJ_COMMUNICATIONS_URL = "https://comunicaapi.pje.jus.br/api/v1/comunicacao";
const DATABASE_BATCH_SIZE = 100;
const PROCESS_PAGE_SIZE = 500;
const RATE_LIMIT_HEADERS = [
  "retry-after",
  "ratelimit-limit",
  "ratelimit-remaining",
  "ratelimit-reset",
  "x-ratelimit-limit",
  "x-ratelimit-remaining",
  "x-ratelimit-reset",
];

type ProcessRow = { id: string; numero_cnj: string | null };

function chunks<T>(items: T[], size: number): T[][] {
  const output: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
}

function publicationRow(
  item: DjenCommunication,
  escritorioId: string,
  processoId: string | null
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
    destinatario_advogados: item.destinatarioadvogados ?? [],
  };
}

async function loadProcessMatches(
  admin: ReturnType<typeof createAdminClient>,
  escritorioId: string,
  processNumbers: Set<string>
) {
  const processIds = new Map<string, string>();
  if (processNumbers.size === 0) return processIds;

  let offset = 0;
  while (true) {
    const { data, error } = await admin
      .from("processos")
      .select("id, numero_cnj")
      .eq("escritorio_id", escritorioId)
      .order("id", { ascending: true })
      .range(offset, offset + PROCESS_PAGE_SIZE - 1);

    if (error || !data) throw new Error("Não foi possível verificar os processos do escritório.");

    for (const processo of data as ProcessRow[]) {
      const normalizedNumber = normalizeCnjNumber(processo.numero_cnj);
      if (normalizedNumber && processNumbers.has(normalizedNumber) && !processIds.has(normalizedNumber)) {
        processIds.set(normalizedNumber, processo.id);
      }
    }

    if (data.length < PROCESS_PAGE_SIZE) break;
    offset += PROCESS_PAGE_SIZE;
  }

  return processIds;
}

function retryAfterSeconds(value: string | null): number | null {
  if (!value) return null;
  if (/^\d+$/.test(value)) return Number(value);

  const date = Date.parse(value);
  if (!Number.isFinite(date)) return null;
  return Math.max(0, Math.ceil((date - Date.now()) / 1000));
}

function readRateLimitDetails(upstream: Response) {
  const firstHeader = (...names: string[]) => {
    for (const name of names) {
      const value = upstream.headers.get(name);
      if (value) return value;
    }
    return null;
  };

  return {
    limit: firstHeader("ratelimit-limit", "x-ratelimit-limit"),
    remaining: firstHeader("ratelimit-remaining", "x-ratelimit-remaining"),
    reset: firstHeader("ratelimit-reset", "x-ratelimit-reset"),
    retryAfter: upstream.headers.get("retry-after"),
  };
}

function forwardRateLimitHeaders(upstream: Response) {
  const headers = new Headers();
  for (const name of RATE_LIMIT_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

function syncFailure(error: string, partial: boolean) {
  return NextResponse.json({ error, partial, safeToRepeat: true }, { status: 500 });
}

export async function POST(request: NextRequest) {
  const auth = await authorizeDjen("write");
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = syncInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados da consulta inválidos." }, { status: 400 });
  }

  const rangeError = validateDateRange(
    parsed.data.dataInicio,
    parsed.data.dataFim,
    getSaoPauloDate()
  );
  if (rangeError) return NextResponse.json({ error: rangeError }, { status: 400 });

  let writesStarted = false;

  try {
    const admin = createAdminClient();
    const { data: monitoramento, error: monitoramentoError } = await admin
      .from("djen_oab_monitoramentos")
      .select("id, numero_oab, uf_oab, ativo")
      .eq("id", parsed.data.monitoramentoId)
      .eq("escritorio_id", auth.escritorioId)
      .maybeSingle();

    if (monitoramentoError) {
      return NextResponse.json({ error: "Não foi possível carregar o monitoramento." }, { status: 500 });
    }

    if (!monitoramento || !monitoramento.ativo) {
      return NextResponse.json({ error: "Monitoramento não encontrado ou inativo." }, { status: 404 });
    }

    const attemptAt = new Date().toISOString();
    const { error: attemptError } = await admin
      .from("djen_oab_monitoramentos")
      .update({ ultima_tentativa_em: attemptAt })
      .eq("id", monitoramento.id)
      .eq("escritorio_id", auth.escritorioId);

    if (attemptError) {
      return NextResponse.json({ error: "Não foi possível iniciar a consulta." }, { status: 500 });
    }

    const url = new URL(CNJ_COMMUNICATIONS_URL);
    url.searchParams.set("numeroOab", monitoramento.numero_oab);
    url.searchParams.set("ufOab", monitoramento.uf_oab);
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
        { status: 502 }
      );
    }

    if (upstream.status === 429) {
      const rateLimit = readRateLimitDetails(upstream);
      const waitSeconds = retryAfterSeconds(rateLimit.retryAfter);
      const headers = forwardRateLimitHeaders(upstream);
      if (!headers.has("retry-after") && waitSeconds !== null) {
        headers.set("retry-after", String(waitSeconds));
      }
      return NextResponse.json(
        {
          error: "O CNJ limitou as consultas neste momento. Aguarde antes de tentar novamente.",
          waitSeconds,
          rateLimit,
        },
        { status: 429, headers }
      );
    }

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "O DJEN não concluiu a consulta. Nenhum resultado foi marcado como vazio." },
        { status: 502 }
      );
    }

    let payload: unknown;
    try {
      payload = await upstream.json();
    } catch {
      return NextResponse.json(
        { error: "O DJEN retornou uma resposta inválida. Nenhum resultado foi marcado como vazio." },
        { status: 502 }
      );
    }

    let response;
    try {
      response = parseDjenResponse(payload);
    } catch {
      return NextResponse.json(
        { error: "Não foi possível validar a resposta do DJEN. Nenhum resultado foi marcado como vazio." },
        { status: 502 }
      );
    }

    const uniqueItems = Array.from(
      new Map(response.items.map((item) => [item.hash, item])).values()
    );
    const processNumbers = new Set(
      uniqueItems
        .map((item) => normalizeCnjNumber(item.numero_processo))
        .filter((number): number is string => number !== null)
    );
    const processIds = await loadProcessMatches(admin, auth.escritorioId, processNumbers);

    const rows = uniqueItems.map((item) => {
      const processNumber = normalizeCnjNumber(item.numero_processo);
      return publicationRow(
        item,
        auth.escritorioId,
        processNumber ? processIds.get(processNumber) ?? null : null
      );
    });

    let newPublications = 0;
    for (const batch of chunks(rows, DATABASE_BATCH_SIZE)) {
      const { data, error } = await admin
        .from("djen_publicacoes")
        .upsert(batch, {
          onConflict: "escritorio_id,hash",
          ignoreDuplicates: true,
        })
        .select("id, hash");

      if (error) {
        return syncFailure("Não foi possível salvar as publicações consultadas.", writesStarted);
      }

      writesStarted = true;
      newPublications += data?.length ?? 0;
    }

    const publicationIds = new Map<string, string>();
    const hashes = uniqueItems.map((item) => item.hash);
    for (const batch of chunks(hashes, DATABASE_BATCH_SIZE)) {
      const { data, error } = await admin
        .from("djen_publicacoes")
        .select("id, hash")
        .eq("escritorio_id", auth.escritorioId)
        .in("hash", batch);

      if (error || !data) {
        return syncFailure("Não foi possível vincular as publicações aos monitoramentos.", writesStarted);
      }

      for (const publication of data as { id: string; hash: string }[]) {
        publicationIds.set(publication.hash, publication.id);
      }
    }

    if (publicationIds.size !== hashes.length) {
      return syncFailure("Não foi possível confirmar o salvamento de todas as publicações.", writesStarted);
    }

    const associations = uniqueItems.flatMap((item) => {
      const publicationId = publicationIds.get(item.hash);
      return publicationId
        ? [{
            escritorio_id: auth.escritorioId,
            publicacao_id: publicationId,
            monitoramento_id: monitoramento.id,
          }]
        : [];
    });

    for (const batch of chunks(associations, DATABASE_BATCH_SIZE)) {
      const { error } = await admin
        .from("djen_publicacoes_monitoramentos")
        .upsert(batch, {
          onConflict: "escritorio_id,publicacao_id,monitoramento_id",
          ignoreDuplicates: true,
        });

      if (error) {
        return syncFailure("Não foi possível registrar o vínculo das publicações com a OAB.", writesStarted);
      }
      writesStarted = true;
    }

    const processHashes = new Map<string, string[]>();
    for (const item of uniqueItems) {
      const processNumber = normalizeCnjNumber(item.numero_processo);
      const processId = processNumber ? processIds.get(processNumber) : undefined;
      if (!processId) continue;

      const hashesForProcess = processHashes.get(processId) ?? [];
      hashesForProcess.push(item.hash);
      processHashes.set(processId, hashesForProcess);
    }

    for (const [processId, hashesForProcess] of processHashes) {
      for (const batch of chunks(hashesForProcess, DATABASE_BATCH_SIZE)) {
        const { error } = await admin
          .from("djen_publicacoes")
          .update({ processo_id: processId })
          .eq("escritorio_id", auth.escritorioId)
          .in("hash", batch);

        if (error) {
          return syncFailure("Não foi possível associar as publicações aos processos.", writesStarted);
        }
        writesStarted = true;
      }
    }

    const syncAt = new Date().toISOString();
    const { error: syncError } = await admin
      .from("djen_oab_monitoramentos")
      .update({ ultima_sincronizacao_em: syncAt })
      .eq("id", monitoramento.id)
      .eq("escritorio_id", auth.escritorioId);

    if (syncError) {
      return syncFailure("Não foi possível atualizar o status da consulta.", writesStarted);
    }

    return NextResponse.json(
      {
        count: response.count,
        novasPublicacoes: newPublications,
        publicacoesAssociadas: associations.length,
        associadasAProcessos: Array.from(processHashes.values()).reduce(
          (total, processHashes) => total + processHashes.length,
          0
        ),
        semResultados: response.count === 0 && response.items.length === 0,
        rateLimit: readRateLimitDetails(upstream),
      },
      { headers: forwardRateLimitHeaders(upstream) }
    );
  } catch {
    return syncFailure(
      "Não foi possível concluir a sincronização. Verifique os resultados antes de repetir.",
      writesStarted
    );
  }
}
