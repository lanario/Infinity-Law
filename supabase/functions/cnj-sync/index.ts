import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CNJ_API_KEY = Deno.env.get("CNJ_DATAJUD_API_KEY")!;
const CNJ_BASE_URL = Deno.env.get("CNJ_DATAJUD_BASE_URL") ?? "https://api-publica.datajud.cnj.jus.br";
const BATCH_SIZE = 10;
const CACHE_HOURS = 12;

interface Processo {
  id: string;
  numero_cnj: string;
  tribunal: string | null;
  escritorio_id: string;
  ultima_sync_cnj: string | null;
}

Deno.serve(async (req) => {
  // Só aceita POST
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Verifica webhook secret se fornecido
  const authHeader = req.headers.get("Authorization");
  const webhookSecret = Deno.env.get("WEBHOOK_SECRET");
  if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const cutoff = new Date(Date.now() - CACHE_HOURS * 60 * 60 * 1000).toISOString();

  // Busca processos que precisam de sync
  const { data: processos, error } = await supabase
    .from("processos")
    .select("id, numero_cnj, tribunal, escritorio_id, ultima_sync_cnj")
    .eq("status", "ativo")
    .or(`ultima_sync_cnj.is.null,ultima_sync_cnj.lt.${cutoff}`)
    .limit(500);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const batch = processos ?? [];
  let synced = 0;
  let failed = 0;

  // Processa em batches de BATCH_SIZE com 1s de delay entre batches
  for (let i = 0; i < batch.length; i += BATCH_SIZE) {
    const chunk = batch.slice(i, i + BATCH_SIZE) as Processo[];

    await Promise.all(
      chunk.map(async (processo) => {
        try {
          await syncProcesso(supabase, processo, CNJ_API_KEY, CNJ_BASE_URL);
          synced++;
        } catch {
          failed++;
          await supabase.from("cnj_sync_errors").insert({
            tribunal: processo.tribunal,
            numero_cnj: processo.numero_cnj,
            mensagem: "Falha no sync automático",
          });
        }
      })
    );

    if (i + BATCH_SIZE < batch.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return new Response(
    JSON.stringify({ total: batch.length, synced, failed }),
    { headers: { "Content-Type": "application/json" } }
  );
});

async function syncProcesso(
  supabase: ReturnType<typeof createClient>,
  processo: Processo,
  apiKey: string,
  baseUrl: string
): Promise<void> {
  const tribunal = inferTribunal(processo.numero_cnj);
  if (!tribunal) return;

  // Formato documentado: <base>/api_publica_<alias>/_search; numeroProcesso só com 20 dígitos.
  const url = `${baseUrl.trim().replace(/\/+$/, "")}/api_publica_${tribunal}/_search`;
  const digits = processo.numero_cnj.replace(/\D/g, "");
  const doFetch = () =>
    fetch(url, {
      method: "POST",
      headers: {
        Authorization: `APIKey ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: { match: { numeroProcesso: digits } } }),
      signal: AbortSignal.timeout(10_000),
    });

  let res = await doFetch();
  if (res.status === 429) {
    // Rate limited — aguarda 2s e tenta 1x
    await new Promise((r) => setTimeout(r, 2000));
    res = await doFetch();
  }
  // 404/401/403/5xx são erro do endpoint, nunca "processo não encontrado" (isso é 200 com hits vazios).
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json: unknown = await res.json();
  const resultado = asRecord(json);
  const hitsData = asRecord(resultado?.hits);
  const hits: unknown[] = Array.isArray(hitsData?.hits) ? hitsData.hits : [];
  if (hits.length === 0) return;

  const primeiroHit = asRecord(hits[0]);
  const fonteProcesso = asRecord(primeiroHit?._source);
  const movimentos: unknown[] = Array.isArray(fonteProcesso?.movimentos) ? fonteProcesso.movimentos : [];
  const primeiraSync = !processo.ultima_sync_cnj;
  const sincronizadoEm = new Date().toISOString();

  const movimentacoes = movimentos.map((rawMovimento) => {
    const movimento = asRecord(rawMovimento) ?? {};
    const dataHoraOriginal = typeof movimento.dataHora === "string" ? movimento.dataHora : "";
    const dataHoraValida = Boolean(dataHoraOriginal) && Number.isFinite(Date.parse(dataHoraOriginal));
    const complementos = Array.isArray(movimento.complementosTabelados)
      ? movimento.complementosTabelados.flatMap((rawComplemento: unknown) => {
        const complemento = asRecord(rawComplemento);
        const nome = typeof complemento?.nome === "string" ? complemento.nome.trim() : "";
        if (!nome) return [];
        const descricao = typeof complemento.descricao === "string" ? complemento.descricao.trim() : "";
        return [{ nome, ...(descricao ? { descricao } : {}) }];
      })
      : [];
    const codigo = movimento.codigo;

    return {
      processo_id: processo.id,
      escritorio_id: processo.escritorio_id,
      data_movimento: dataHoraValida
        ? (dataHoraOriginal.split("T")[0] || sincronizadoEm.slice(0, 10))
        : sincronizadoEm.slice(0, 10),
      descricao: String(movimento.nome ?? "Movimento"),
      codigo_cnj: codigo == null || codigo === "" ? null : String(codigo),
      fonte: "datajud",
      data_hora: dataHoraValida ? new Date(dataHoraOriginal).toISOString() : null,
      complementos: complementos.length > 0 ? complementos : null,
      ...(primeiraSync ? { visto_em: sincronizadoEm } : {}),
    };
  });

  await Promise.all([
    supabase
      .from("processos")
      .update({ ultima_sync_cnj: sincronizadoEm })
      .eq("id", processo.id),
    movimentacoes.length > 0
      ? supabase
          .from("processo_movimentacoes")
          .upsert(movimentacoes, {
            onConflict: "processo_id,data_movimento,descricao",
            ignoreDuplicates: true,
          })
      : Promise.resolve(),
  ]);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
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

  if (j === "1") return null; // STF: sem alias documentado
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
  if (j === "7") {
    // A API Pública documenta um único índice para a Justiça Militar da União (STM).
    return /^(0[0-9]|1[0-2])$/.test(tt) ? "stm" : null;
  }
  if (j === "8") return estadualMap[tt] ?? null;
  if (j === "9") return militarEstadualMap[tt] ?? null;

  // STF (código 1) e CNJ (código 2) não têm alias documentado na API Pública.
  return null;
}
