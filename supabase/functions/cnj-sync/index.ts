import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CNJ_API_KEY = Deno.env.get("CNJ_DATAJUD_API_KEY")!;
const CNJ_BASE_URL = Deno.env.get("CNJ_DATAJUD_BASE_URL") ?? "https://api-publica.datajud.cnj.jus.br";
const CRON_SECRET = Deno.env.get("CNJ_SYNC_CRON_SECRET");
const PAGE_SIZE = 50;
const BATCH_SIZE = 10;
const SYNC_INTERVAL_HOURS = 24;
const LEASE_MINUTES = 10;
const CNJ_FORMAT = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;

interface Processo {
  id: string;
  numero_cnj: string | null;
  tribunal: string | null;
  escritorio_id: string;
  ultima_sync_cnj: string | null;
}

interface SyncState {
  cursor_processo_id: string | null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const suppliedSecret = req.headers.get("X-Cron-Secret");
  if (!CRON_SECRET || !suppliedSecret || suppliedSecret !== CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !CNJ_API_KEY) {
    return jsonResponse({ error: "Integração CNJ não configurada" }, 500);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const leaseToken = crypto.randomUUID();
  const now = new Date();
  const cutoff = new Date(now.getTime() - SYNC_INTERVAL_HOURS * 60 * 60 * 1000).toISOString();
  const leaseUntil = new Date(now.getTime() + LEASE_MINUTES * 60 * 1000).toISOString();

  const { data: state, error: leaseError } = await supabase
    .from("cnj_sync_state")
    .update({ lease_token: leaseToken, lease_until: leaseUntil })
    .eq("id", "automatic")
    .or(`lease_until.is.null,lease_until.lt.${now.toISOString()}`)
    .select("cursor_processo_id")
    .maybeSingle();

  if (leaseError) {
    return jsonResponse({ error: "Não foi possível adquirir o lease do sync CNJ" }, 500);
  }
  if (!state) {
    return jsonResponse({ skipped: "sync em andamento" });
  }

  let cursor = (state as SyncState).cursor_processo_id;
  let total = 0;
  let synced = 0;
  let failed = 0;
  let skippedInvalid = 0;
  let skippedDailyCooldown = 0;

  try {
    let page = await getEligiblePage(supabase, cutoff, cursor);
    if (page.length === 0 && cursor) {
      // Completa uma volta pelo conjunto elegível e inicia a próxima em uma execução posterior.
      cursor = null;
      await saveCursor(supabase, leaseToken, cursor);
      page = await getEligiblePage(supabase, cutoff, cursor);
    }

    total = page.length;
    if (page.length === 0) {
      return jsonResponse({ total, synced, failed, skippedInvalid, skippedDailyCooldown });
    }

    for (let offset = 0; offset < page.length; offset += BATCH_SIZE) {
      const chunk = page.slice(offset, offset + BATCH_SIZE);
      const results = await Promise.all(chunk.map(async (processo) => {
        const numeroCNJ = typeof processo.numero_cnj === "string" ? processo.numero_cnj.trim() : "";
        if (!CNJ_FORMAT.test(numeroCNJ)) {
          return "invalid" as const;
        }

        const claimToken = crypto.randomUUID();
        try {
          const { data: claimed, error: claimError } = await supabase.rpc("claim_cnj_sync_process", {
            p_processo_id: processo.id,
            p_escritorio_id: processo.escritorio_id,
            p_lease_token: claimToken,
            p_lease_seconds: LEASE_MINUTES * 60,
          });
          if (claimError) throw new Error("Falha ao reservar a sincronização CNJ");
          if (claimed !== true) return "daily_cooldown" as const;

          return await syncProcesso(
            supabase,
            { ...processo, numero_cnj: numeroCNJ },
            CNJ_API_KEY,
            CNJ_BASE_URL,
            cutoff,
          );
        } catch (error) {
          await recordSyncError(supabase, processo, error);
          return "failed" as const;
        } finally {
          // Também libera se a resposta do RPC se perder depois de gravar a reserva.
          // O token impede afetar uma reserva pertencente a outra chamada.
          await releaseProcessClaim(supabase, processo, claimToken);
        }
      }));

      for (const result of results) {
        if (result === "synced") synced++;
        else if (result === "failed") failed++;
        else if (result === "invalid") skippedInvalid++;
        else if (result === "daily_cooldown" || result === "recent_sync") skippedDailyCooldown++;
      }

      cursor = chunk.at(-1)?.id ?? cursor;
      await saveCursor(supabase, leaseToken, cursor);
      if (offset + BATCH_SIZE < page.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return jsonResponse({ total, synced, failed, skippedInvalid, skippedDailyCooldown, nextCursor: cursor });
  } catch (error) {
    return jsonResponse({ error: safeErrorMessage(error) }, 500);
  } finally {
    await supabase
      .from("cnj_sync_state")
      .update({ lease_token: null, lease_until: null, updated_at: new Date().toISOString() })
      .eq("id", "automatic")
      .eq("lease_token", leaseToken);
  }
});

async function getEligiblePage(
  supabase: ReturnType<typeof createClient>,
  cutoff: string,
  cursor: string | null,
): Promise<Processo[]> {
  let query = supabase
    .from("processos")
    .select("id, numero_cnj, tribunal, escritorio_id, ultima_sync_cnj")
    .eq("status", "ativo")
    .not("numero_cnj", "is", null)
    .or(`ultima_sync_cnj.is.null,ultima_sync_cnj.lt.${cutoff}`)
    .order("id", { ascending: true })
    .limit(PAGE_SIZE);

  if (cursor) query = query.gt("id", cursor);

  const { data, error } = await query;
  if (error) throw new Error("Falha ao consultar a próxima página de processos elegíveis");
  return (data ?? []) as Processo[];
}

async function saveCursor(
  supabase: ReturnType<typeof createClient>,
  leaseToken: string,
  cursor: string | null,
): Promise<void> {
  const { data, error } = await supabase
    .from("cnj_sync_state")
    .update({ cursor_processo_id: cursor, updated_at: new Date().toISOString() })
    .eq("id", "automatic")
    .eq("lease_token", leaseToken)
    .select("id")
    .maybeSingle();
  if (error || !data) throw new Error("Falha ao salvar o cursor do sync CNJ");
}

async function releaseProcessClaim(
  supabase: ReturnType<typeof createClient>,
  processo: Processo,
  leaseToken: string,
): Promise<void> {
  try {
    const { error } = await supabase.rpc("release_cnj_sync_process", {
      p_processo_id: processo.id,
      p_escritorio_id: processo.escritorio_id,
      p_lease_token: leaseToken,
    });
    if (error) console.error("[CNJ sync] Falha ao liberar reserva do processo", processo.id);
  } catch {
    console.error("[CNJ sync] Falha ao liberar reserva do processo", processo.id);
  }
}

async function syncProcesso(
  supabase: ReturnType<typeof createClient>,
  processo: Processo & { numero_cnj: string },
  apiKey: string,
  baseUrl: string,
  cutoff: string,
): Promise<"synced" | "recent_sync"> {
  const { data: atual, error: readError } = await supabase
    .from("processos")
    .select("status, ultima_sync_cnj")
    .eq("id", processo.id)
    .maybeSingle();
  if (readError) throw new Error("Falha ao confirmar processo ativo antes do sync");
  if (!atual || atual.status !== "ativo") return "recent_sync";
  if (atual.ultima_sync_cnj && Date.parse(atual.ultima_sync_cnj) >= Date.parse(cutoff)) return "recent_sync";

  const tribunal = inferTribunal(processo.numero_cnj);
  if (!tribunal) throw new Error("Tribunal CNJ sem índice compatível no DataJud");

  const url = `${baseUrl.trim().replace(/\/+$/, "")}/api_publica_${tribunal}/_search`;
  const digits = processo.numero_cnj.replace(/\D/g, "");
  const doFetch = () => fetch(url, {
    method: "POST",
    headers: {
      Authorization: `APIKey ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: { match: { numeroProcesso: digits } } }),
    signal: AbortSignal.timeout(10_000),
  });

  let response = await doFetch();
  if (response.status === 429) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    response = await doFetch();
  }
  if (!response.ok) throw new Error(`DataJud HTTP ${response.status}`);

  const json: unknown = await response.json();
  const resultado = asRecord(json);
  const hitsData = asRecord(resultado?.hits);
  if (!Array.isArray(hitsData?.hits)) throw new Error("Resposta DataJud inválida");
  const hits: unknown[] = hitsData.hits;
  const sincronizadoEm = new Date().toISOString();
  let movimentos: unknown[] = [];
  if (hits.length > 0) {
    const primeiroHit = asRecord(hits[0]);
    const fonteProcesso = asRecord(primeiroHit?._source);
    if (!fonteProcesso || !Array.isArray(fonteProcesso.movimentos)) {
      throw new Error("Resposta DataJud inválida");
    }
    movimentos = fonteProcesso.movimentos;
  }

  if (movimentos.length > 0) {
    const primeiraSync = !processo.ultima_sync_cnj;
    const movimentacoes = movimentos.map((rawMovimento) => {
      const movimento = asRecord(rawMovimento);
      const nome = typeof movimento?.nome === "string" ? movimento.nome.trim() : "";
      const rawComplementos = Array.isArray(movimento?.complementosTabelados)
        ? movimento.complementosTabelados
        : [];
      const primeiroComplemento = asRecord(rawComplementos[0]);
      const descricaoComplemento = typeof primeiroComplemento?.descricao === "string"
        ? primeiroComplemento.descricao.trim()
        : "";
      const descricao = nome || descricaoComplemento;
      const timestamp = parseDataJudTimestamp(movimento?.dataHora);
      if (!movimento || !descricao || !timestamp) {
        throw new Error("Resposta DataJud inválida");
      }
      const complementos = rawComplementos
        .flatMap((rawComplemento: unknown) => {
          const complemento = asRecord(rawComplemento);
          const nome = typeof complemento?.nome === "string" ? complemento.nome.trim() : "";
          if (!nome) return [];
          const descricao = typeof complemento.descricao === "string" ? complemento.descricao.trim() : "";
          return [{ nome, ...(descricao ? { descricao } : {}) }];
        });
      const codigo = movimento.codigo;

      return {
        processo_id: processo.id,
        escritorio_id: processo.escritorio_id,
        data_movimento: timestamp.dataMovimento,
        descricao,
        codigo_cnj: codigo == null || codigo === "" ? null : String(codigo),
        fonte: "datajud",
        data_hora: new Date(timestamp.dataHoraOriginal).toISOString(),
        complementos: complementos.length > 0 ? complementos : null,
        ...(primeiraSync ? { visto_em: sincronizadoEm } : {}),
      };
    });

    const { error: movementError } = await supabase
      .from("processo_movimentacoes")
      .upsert(movimentacoes, {
        onConflict: "processo_id,data_movimento,descricao",
        ignoreDuplicates: true,
      });
    if (movementError) throw new Error("Falha ao gravar movimentações do DataJud");
  }

  const { data: updated, error: updateError } = await supabase
    .from("processos")
    .update({ ultima_sync_cnj: sincronizadoEm })
    .eq("id", processo.id)
    .eq("status", "ativo")
    .select("id")
    .maybeSingle();
  if (updateError) throw new Error("Falha ao atualizar a data de sync CNJ");
  if (!updated) return "recent_sync";

  return "synced";
}

async function recordSyncError(
  supabase: ReturnType<typeof createClient>,
  processo: Processo,
  error: unknown,
): Promise<void> {
  try {
    const message = safeErrorMessage(error);
    const statusMatch = message.match(/HTTP (\d{3})/);
    await supabase.from("cnj_sync_errors").insert({
      tribunal: processo.tribunal,
      numero_cnj: processo.numero_cnj,
      http_status: statusMatch ? Number(statusMatch[1]) : null,
      mensagem: statusMatch ? `Falha no DataJud (HTTP ${statusMatch[1]})` : "Falha no sync automático",
    });
  } catch {
    // Uma falha no log não interrompe o processamento dos demais processos.
  }
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Falha desconhecida no sync CNJ";
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function parseDataJudTimestamp(value: unknown): { dataMovimento: string; dataHoraOriginal: string } | null {
  if (typeof value !== "string") return null;
  const timestampOriginal = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:0\d|1\d|2[0-3]):[0-5]\d)?$/.exec(timestampOriginal);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1]) return null;

  const timestamp = Date.parse(timestampOriginal);
  if (!Number.isFinite(timestamp)) return null;
  return {
    dataMovimento: `${match[1]}-${match[2]}-${match[3]}`,
    dataHoraOriginal: timestampOriginal,
  };
}

// Tabela J.TR espelhada de src/lib/cnj/tribunais.ts (fonte única; não importável aqui). Altere as duas juntas.
function inferTribunal(numeroCNJ: string): string | null {
  const match = numeroCNJ.match(/^\d{7}-\d{2}\.\d{4}\.(\d)\.(\d{2})\.\d{4}$/);
  if (!match) return null;
  const [, j, tt] = match;
  if (j === undefined || tt === undefined) return null;

  const estadualMap: Record<string, string> = {
    "01": "tjac", "02": "tjal", "03": "tjap", "04": "tjam", "05": "tjba",
    "06": "tjce", "07": "tjdft", "08": "tjes", "09": "tjgo", "10": "tjma",
    "11": "tjmt", "12": "tjms", "13": "tjmg", "14": "tjpa", "15": "tjpb",
    "16": "tjpr", "17": "tjpe", "18": "tjpi", "19": "tjrj", "20": "tjrn",
    "21": "tjrs", "22": "tjro", "23": "tjrr", "24": "tjsc", "25": "tjse",
    "26": "tjsp", "27": "tjto",
  };
  const federalMap: Record<string, string> = {
    "01": "trf1", "02": "trf2", "03": "trf3", "04": "trf4", "05": "trf5", "06": "trf6",
  };
  const eleitoralMap: Record<string, string> = {
    "01": "tre-ac", "02": "tre-al", "03": "tre-ap", "04": "tre-am", "05": "tre-ba",
    "06": "tre-ce", "07": "tre-dft", "08": "tre-es", "09": "tre-go", "10": "tre-ma",
    "11": "tre-mt", "12": "tre-ms", "13": "tre-mg", "14": "tre-pa", "15": "tre-pb",
    "16": "tre-pr", "17": "tre-pe", "18": "tre-pi", "19": "tre-rj", "20": "tre-rn",
    "21": "tre-rs", "22": "tre-ro", "23": "tre-rr", "24": "tre-sc", "25": "tre-se",
    "26": "tre-sp", "27": "tre-to",
  };
  const militarEstadualMap: Record<string, string> = {
    "13": "tjmmg", "21": "tjmrs", "26": "tjmsp",
  };

  if (j === "1") return null;
  if (j === "3") return tt === "00" ? "stj" : null;
  if (j === "4") return federalMap[tt] ?? null;
  if (j === "5") {
    if (tt === "00") return "tst";
    return /^(0[1-9]|1[0-9]|2[0-4])$/.test(tt) ? `trt${Number(tt)}` : null;
  }
  if (j === "6") {
    if (tt === "00") return "tse";
    return eleitoralMap[tt] ?? null;
  }
  if (j === "7") return /^(0[0-9]|1[0-2])$/.test(tt) ? "stm" : null;
  if (j === "8") return estadualMap[tt] ?? null;
  if (j === "9") return militarEstadualMap[tt] ?? null;
  return null;
}
