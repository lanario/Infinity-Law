export interface Movimentacao {
  data: string;
  descricao: string;
  codigo?: string;
  data_hora?: string | null;
  complementos?: Array<{ nome: string; descricao?: string }> | null;
}

export interface ProcessoDataJud {
  numeroCNJ: string;
  tribunal: string;
  classe: string;
  assunto: string;
  orgaoJulgador: string;
  uf: string;
  partes: Array<{ nome: string; tipo: string }>;
  movimentacoes: Movimentacao[];
  dataUltimaMovimentacao?: string;
  dataAjuizamento?: string;
  grau?: string;
  sistema?: string;
  nivelSigilo?: number;
  dataHoraUltimaAtualizacao?: string;
  codigoMunicipioIBGE?: string;
  classeCodigo?: string;
  assuntoCodigo?: string;
}

export interface IProcessoProvider {
  consultarPorNumero(numeroCNJ: string, processoConfirmado?: boolean): Promise<ProcessoDataJud | null>;
  listarMovimentacoes(numeroCNJ: string, desde?: Date): Promise<Movimentacao[]>;
}
