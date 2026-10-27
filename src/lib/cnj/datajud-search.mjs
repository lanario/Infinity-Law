// Núcleo da consulta ao DataJud (sem Next/TS) para ser testável com fetch simulado.

// Orçamento total da consulta (tentativas + esperas). A rota usa maxDuration 30s; sobra margem para auth e banco.
export const DATAJUD_TOTAL_BUDGET_MS = 25_000;

// Só os campos que o DataJudAdapter mapeia.
export const DATAJUD_SOURCE_FIELDS = ["tribunal", "classe", "assuntos", "orgaoJulgador", "partes", "movimentos"];

/**
 * kind: "http" (status do endpoint), "timeout", "network" ou "invalid_response".
 * Nunca carrega URL, chave ou corpo da resposta.
 */
export class DataJudError extends Error {
  /**
   * @param {string} message
   * @param {number} status 0 quando não houve resposta HTTP
   * @param {"http" | "timeout" | "network" | "invalid_response"} kind
   */
  constructor(message, status, kind = "http", detail = "") {
    super(message);
    this.elapsedMs = undefined; // preenchido por searchDataJud
    this.alias = undefined; // tribunal/alias consultado (nunca URL/chave)
    this.detail = detail; // só nome/código técnico (ex.: "TypeError ENOTFOUND"), nunca URL/chave
    this.name = "DataJudError";
    this.status = status;
    this.kind = kind;
  }
}

/** Só dígitos: o índice do DataJud guarda numeroProcesso sem máscara (20 dígitos). */
export function toDataJudNumber(numeroCNJ) {
  const digits = String(numeroCNJ).replace(/\D/g, "");
  return digits.length === 20 ? digits : null;
}

/** Formato documentado: <base>/api_publica_<alias>/_search, sem barras duplicadas. */
export function buildDataJudSearchUrl(baseUrl, alias) {
  return `${String(baseUrl).trim().replace(/\/+$/, "")}/api_publica_${alias}/_search`;
}

/**
 * Busca um processo e devolve o _source do primeiro hit.
 * Retorna null SOMENTE para HTTP 200 com hits vazios; qualquer outra falha lança DataJudError.
 *
 * @param {{ baseUrl: string, apiKey: string, alias: string, numeroCNJ: string,
 *   fetchImpl?: typeof fetch, totalBudgetMs?: number, delayMs?: number }} opts
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function searchDataJud(opts) {
  const { baseUrl, apiKey, alias, numeroCNJ, fetchImpl = fetch, totalBudgetMs = DATAJUD_TOTAL_BUDGET_MS } = opts;
  const numero = toDataJudNumber(numeroCNJ);
  if (!numero) throw new DataJudError("Número CNJ inválido", 0, "invalid_response");

  const url = buildDataJudSearchUrl(baseUrl, alias);
  const body = JSON.stringify({
    size: 1,
    _source: DATAJUD_SOURCE_FIELDS,
    query: { match: { numeroProcesso: numero } },
  });
  const startedAt = Date.now();
  const deadline = startedAt + totalBudgetMs;
  // Um único sinal para o conjunto (tentativas + esperas).
  const signal = AbortSignal.timeout(totalBudgetMs);

  async function attempt() {
    let res;
    try {
      res = await fetchImpl(url, {
        method: "POST",
        headers: { Authorization: `APIKey ${String(apiKey).trim()}`, "Content-Type": "application/json" },
        body,
        signal,
      });
    } catch (err) {
      const name = err && typeof err === "object" ? err.name : "";
      if (name === "TimeoutError" || name === "AbortError") {
        throw new DataJudError("DataJud timeout", 0, "timeout");
      }
      const detail = [
        name,
        err?.cause?.code,
        /Invalid (URL|header)|parse URL|fetch failed/.exec(String(err?.message))?.[0],
      ].filter(Boolean).join(" ");
      throw new DataJudError("DataJud network error", 0, "network", detail);
    }

    if (!res.ok) throw new DataJudError(`DataJud error ${res.status}`, res.status, "http");

    let json;
    try {
      json = await res.json();
    } catch {
      throw new DataJudError("DataJud invalid response", res.status, "invalid_response");
    }
    const hits = json?.hits?.hits;
    if (!Array.isArray(hits)) {
      throw new DataJudError("DataJud invalid response", res.status, "invalid_response");
    }
    return hits[0]?._source ?? null;
  }

  // Backoff exponencial só para 429, respeitando o orçamento total.
  let retries = 2;
  let delay = opts.delayMs ?? 500;
  while (true) {
    try {
      return await attempt();
    } catch (err) {
      if (err instanceof DataJudError) {
        err.elapsedMs = Date.now() - startedAt;
        err.alias = alias;
      }
      const rateLimited = err instanceof DataJudError && err.status === 429;
      if (retries <= 0 || !rateLimited || deadline - Date.now() <= delay + 1_000) throw err;
      await new Promise((r) => setTimeout(r, delay));
      retries -= 1;
      delay *= 2;
    }
  }
}
