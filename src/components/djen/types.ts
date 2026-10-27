export type Monitoramento = {
  id: string;
  numero_oab: string;
  uf_oab: string;
  ativo: boolean;
  ultima_tentativa_em: string | null;
  ultima_sincronizacao_em: string | null;
};

export type Publicacao = {
  id: string;
  processo_id: string | null;
  numero_processo: string | null;
  numero_processo_com_mascara: string | null;
  data_disponibilizacao: string | null;
  tribunal: string | null;
  tipo_comunicacao: string | null;
  orgao: string | null;
  texto: string | null;
  meio: string | null;
  meio_completo: string | null;
  link: string | null;
  tipo_documento: string | null;
  nome_classe: string | null;
  codigo_classe: string | null;
  numero_comunicacao: number | null;
  comunicacao_ativa: boolean | null;
  destinatarios: Array<{ nome?: string | null; polo?: string | null; comunicacao_id?: number | null }>;
  destinatario_advogados: unknown[];
};

export type Associacao = { publicacao_id: string; monitoramento_id: string };
export type Processo = { id: string; numero_cnj: string | null };
export type Message = { kind: "success" | "error"; text: string };

export interface DjenIntimacoesPanelProps {
  monitoramentos: Monitoramento[];
  publicacoes: Publicacao[];
  associacoes: Associacao[];
  processos: Processo[];
  podeEditar: boolean;
  podePesquisarCliente: boolean;
  podeLerProcessos: boolean;
  podeAssociarProcesso: boolean;
  today: string;
  defaultStartDate: string;
  publicationError: string | null;
  monitoringError: string | null;
  relatedDataError: string | null;
}
