import type {
  IProcessoProvider,
  ProcessoDataJud,
  Movimentacao,
} from "./IProcessoProvider";
import { getTribunalEndpoint } from "./cnj-validator";

interface DataJudConfig {
  apiKey: string;
  baseUrl: string;
}

// Orçamento total (tentativas + esperas) abaixo de 10s para caber em maxDuration da rota.
const TOTAL_BUDGET_MS = 9_000;
const FETCH_TIMEOUT_MS = 10_000;

// Exponential backoff para rate limiting, respeitando o orçamento total
async function withRetry<T>(
  fn: (remainingMs: number) => Promise<T>,
  deadline: number,
  retries = 2,
  delayMs = 500
): Promise<T> {
  try {
    return await fn(deadline - Date.now());
  } catch (err) {
    const isRateLimit =
      err instanceof DataJudError && err.status === 429;
    if (retries <= 0 || !isRateLimit || deadline - Date.now() <= delayMs + 1_000) throw err;
    await new Promise((r) => setTimeout(r, delayMs));
    return withRetry(fn, deadline, retries - 1, delayMs * 2);
  }
}

class DataJudError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "DataJudError";
  }
}

export class DataJudAdapter implements IProcessoProvider {
  constructor(private config: DataJudConfig) {}

  async consultarPorNumero(numeroCNJ: string): Promise<ProcessoDataJud | null> {
    const tribunal = getTribunalEndpoint(numeroCNJ);
    if (!tribunal) return null;

    return withRetry(async (remainingMs) => {
      const url = `${this.config.baseUrl}/api_publica/${tribunal}/_search`;
      const body = JSON.stringify({
        query: {
          match: { "numeroProcesso": numeroCNJ },
        },
      });

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `ApiKey ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body,
        signal: AbortSignal.timeout(Math.min(FETCH_TIMEOUT_MS, remainingMs)),
      });

      if (res.status === 404) return null;
      if (!res.ok) {
        throw new DataJudError(`DataJud error ${res.status}`, res.status);
      }

      const json = (await res.json()) as {
        hits?: { hits?: Array<{ _source: Record<string, unknown> }> };
      };

      const hits = json.hits?.hits ?? [];
      if (hits.length === 0) return null;

      return this.mapToProcessoDataJud(hits[0]!._source, numeroCNJ);
    }, Date.now() + TOTAL_BUDGET_MS);
  }

  async listarMovimentacoes(
    numeroCNJ: string,
    _desde?: Date
  ): Promise<Movimentacao[]> {
    const processo = await this.consultarPorNumero(numeroCNJ);
    return processo?.movimentacoes ?? [];
  }

  private mapToProcessoDataJud(
    source: Record<string, unknown>,
    numeroCNJ: string
  ): ProcessoDataJud {
    const movimentos = (
      (source["movimentos"] as Array<Record<string, unknown>>) ?? []
    ).map((m) => ({
      data: String(m["dataHora"] ?? ""),
      descricao:
        (m["nome"] as string) ??
        ((m["complementosTabelados"] as Array<Record<string, unknown>>)?.[0]?.[
          "descricao"
        ] as string) ??
        "Movimento sem descrição",
      codigo: String(m["codigo"] ?? ""),
    }));

    return {
      numeroCNJ,
      tribunal: String(source["tribunal"] ?? ""),
      classe: String(
        (source["classe"] as Record<string, unknown>)?.["nome"] ?? ""
      ),
      assunto: String(
        (
          (source["assuntos"] as Array<Record<string, unknown>>)?.[0] as Record<
            string,
            unknown
          >
        )?.["nome"] ?? ""
      ),
      orgaoJulgador: String(
        (source["orgaoJulgador"] as Record<string, unknown>)?.["nome"] ?? ""
      ),
      uf: String(source["tribunal"] ?? "").slice(-2).toUpperCase(),
      partes: (
        (source["partes"] as Array<Record<string, unknown>>) ?? []
      ).map((p) => ({
        nome: String(p["nome"] ?? ""),
        tipo: String(p["polo"] ?? ""),
      })),
      movimentacoes: movimentos,
      dataUltimaMovimentacao: movimentos[0]?.data,
    };
  }
}
