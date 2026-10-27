import type {
  IProcessoProvider,
  ProcessoDataJud,
  Movimentacao,
} from "./IProcessoProvider";
import { getTribunalEndpoint } from "./cnj-validator";
import { searchDataJud } from "./datajud-search.mjs";
import { ufFromCnj } from "./datajud-autofill.mjs";

interface DataJudConfig {
  apiKey: string;
  baseUrl: string;
}

export class DataJudAdapter implements IProcessoProvider {
  constructor(private config: DataJudConfig) {}

  async consultarPorNumero(numeroCNJ: string): Promise<ProcessoDataJud | null> {
    const tribunal = getTribunalEndpoint(numeroCNJ);
    if (!tribunal) return null;

    const source = await searchDataJud({
      baseUrl: this.config.baseUrl,
      apiKey: this.config.apiKey,
      alias: tribunal,
      numeroCNJ,
    });
    return source ? this.mapToProcessoDataJud(source, numeroCNJ) : null;
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
    const opt = (v: unknown) => (v == null || v === "" ? undefined : String(v));
    const arr = (v: unknown) => (Array.isArray(v) ? (v as Array<Record<string, unknown>>) : []);
    const movimentos = arr(source["movimentos"]).map((m) => ({
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
      codigoMunicipioIBGE: opt(
        (source["orgaoJulgador"] as Record<string, unknown>)?.["codigoMunicipioIBGE"]
      ),
    };
  }
}
