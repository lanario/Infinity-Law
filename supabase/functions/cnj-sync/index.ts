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
    .select("id, numero_cnj, tribunal, escritorio_id")
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
  // deno-lint-ignore no-explicit-any
  supabase: any,
  processo: Processo,
  apiKey: string,
  baseUrl: string
): Promise<void> {
  const tribunal = inferTribunal(processo.numero_cnj);
  if (!tribunal) return;

  const url = `${baseUrl}/api_publica/${tribunal}/_search`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `ApiKey ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: { match: { numeroProcesso: processo.numero_cnj } },
    }),
  });

  if (!res.ok) {
    if (res.status === 429) {
      // Rate limited — aguarda 2s e tenta 1x
      await new Promise((r) => setTimeout(r, 2000));
      const retry = await fetch(url, {
        method: "POST",
        headers: { Authorization: `ApiKey ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query: { match: { numeroProcesso: processo.numero_cnj } } }),
      });
      if (!retry.ok) throw new Error(`HTTP ${retry.status}`);
    } else {
      throw new Error(`HTTP ${res.status}`);
    }
  }

  // deno-lint-ignore no-explicit-any
  const json = await res.json() as any;
  const hits = json?.hits?.hits ?? [];
  if (hits.length === 0) return;

  // deno-lint-ignore no-explicit-any
  const movimentos: any[] = hits[0]?._source?.movimentos ?? [];

  const movimentacoes = movimentos.map(
    // deno-lint-ignore no-explicit-any
    (m: any) => ({
      processo_id: processo.id,
      escritorio_id: processo.escritorio_id,
      data_movimento: String(m.dataHora ?? "").split("T")[0] ?? new Date().toISOString().split("T")[0],
      descricao: String(m.nome ?? "Movimento"),
      codigo_cnj: m.codigo ? String(m.codigo) : null,
      fonte: "datajud",
    })
  );

  await Promise.all([
    supabase
      .from("processos")
      .update({ ultima_sync_cnj: new Date().toISOString() })
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
    "01": "tre-ac", "02": "tre-al", "03": "tre-am", "04": "tre-ap", "05": "tre-ba",
    "06": "tre-ce", "07": "tre-dft", "08": "tre-es", "09": "tre-go", "10": "tre-ma",
    "11": "tre-mg", "12": "tre-ms", "13": "tre-mt", "14": "tre-pa", "15": "tre-pb",
    "16": "tre-pe", "17": "tre-pi", "18": "tre-pr", "19": "tre-rj", "20": "tre-rn",
    "21": "tre-ro", "22": "tre-rr", "23": "tre-rs", "24": "tre-sc", "25": "tre-se",
    "26": "tre-sp", "27": "tre-to",
  };
  const militarEstadualMap: Record<string, string> = {
    "13": "tjmmg", "21": "tjmrs", "26": "tjmsp",
  };

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
