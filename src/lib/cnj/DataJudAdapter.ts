import type {
  IProcessoProvider,
  ProcessoDataJud,
  Movimentacao,
} from "./IProcessoProvider";
import { getTribunalEndpoint } from "./cnj-validator";
import { DataJudError, mapMovimento, searchDataJud } from "./datajud-search.mjs";
import { ufFromCnj } from "./datajud-autofill.mjs";

interface DataJudConfig {
  apiKey: string;
  baseUrl: string;
}

export class DataJudAdapter implements IProcessoProvider {
  constructor(private config: DataJudConfig) {}

  async consultarPorNumero(
    numeroCNJ: string,
    validarMovimentacoes = false
  ): Promise<ProcessoDataJud | null> {
    const tribunal = getTribunalEndpoint(numeroCNJ);
    if (!tribunal) return null;

    const source = await searchDataJud({
      baseUrl: this.config.baseUrl,
      apiKey: this.config.apiKey,
      alias: tribunal,
      numeroCNJ,
    });
    return source ? this.mapToProcessoDataJud(source, numeroCNJ, validarMovimentacoes) : null;
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
    numeroCNJ: string,
    validarMovimentacoes: boolean
  ): ProcessoDataJud {
    const opt = (v: unknown) => (v == null || v === "" ? undefined : String(v));
    const arr = (v: unknown) => (Array.isArray(v) ? (v as Array<Record<string, unknown>>) : []);
    const rawMovimentos = source["movimentos"];
    if (validarMovimentacoes && !Array.isArray(rawMovimentos)) {
      throw new DataJudError("DataJud invalid response", 200, "invalid_response");
    }
    const movimentos: Movimentacao[] = arr(rawMovimentos).map((rawMovimento) => {
      if (!validarMovimentacoes) return mapMovimento(rawMovimento);
      const movimento = asRecord(rawMovimento);
      const complementos = Array.isArray(movimento?.complementosTabelados)
        ? movimento.complementosTabelados
        : [];
      const primeiroComplemento = asRecord(complementos[0]);
      const nome = typeof movimento?.nome === "string" ? movimento.nome.trim() : "";
      const descricaoComplemento = typeof primeiroComplemento?.descricao === "string"
        ? primeiroComplemento.descricao.trim()
        : "";
      const descricao = nome || descricaoComplemento;
      if (!movimento || !descricao || !isValidDataJudDateTime(movimento.dataHora)) {
        throw new DataJudError("DataJud invalid response", 200, "invalid_response");
      }
      return { ...mapMovimento(rawMovimento), descricao };
    });

    return {
      numeroCNJ,
      tribunal: String(source["tribunal"] ?? ""),
      classe: String(
        (source["classe"] as Record<string, unknown>)?.["nome"] ?? ""
      ),
      assunto: String(
        (
          arr(source["assuntos"])?.[0] as Record<
            string,
            unknown
          >
        )?.["nome"] ?? ""
      ),
      orgaoJulgador: String(
        (source["orgaoJulgador"] as Record<string, unknown>)?.["nome"] ?? ""
      ),
      uf: ufFromCnj(numeroCNJ),
      partes: arr(source["partes"]).map((p) => ({
        nome: String(p["nome"] ?? ""),
        tipo: String(p["polo"] ?? ""),
      })),
      movimentacoes: movimentos,
      dataUltimaMovimentacao: movimentos[0]?.data,
      dataAjuizamento: opt(source["dataAjuizamento"]),
      grau: opt(source["grau"]),
      sistema: opt((source["sistema"] as Record<string, unknown>)?.["nome"]),
      nivelSigilo: Number(source["nivelSigilo"] ?? 0) || 0,
      dataHoraUltimaAtualizacao: opt(source["dataHoraUltimaAtualizacao"]),
      classeCodigo: opt((source["classe"] as Record<string, unknown>)?.["codigo"]),
      assuntoCodigo: opt((arr(source["assuntos"])[0] as Record<string, unknown> | undefined)?.["codigo"]),
      codigoMunicipioIBGE: opt(
        (source["orgaoJulgador"] as Record<string, unknown>)?.["codigoMunicipioIBGE"]
      ),
    };
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function isValidDataJudDateTime(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const dateTime = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:0\d|1\d|2[0-3]):[0-5]\d)?$/.exec(dateTime);
  if (!match || !match[1] || !match[2] || !match[3]) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1) return false;
  const monthLength = daysInMonth[month - 1];
  return monthLength !== undefined && day <= monthLength && Number.isFinite(Date.parse(dateTime));
}
