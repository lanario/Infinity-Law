import type { Database } from "./database.types";

export type Escritorio = Database["public"]["Tables"]["escritorios"]["Row"];
export type Cargo = Database["public"]["Tables"]["cargos"]["Row"];
export type Usuario = Database["public"]["Tables"]["usuarios"]["Row"];
export type Cliente = Database["public"]["Tables"]["clientes"]["Row"];
export type Processo = Database["public"]["Tables"]["processos"]["Row"];
export type ProcessoMovimentacao = Database["public"]["Tables"]["processo_movimentacoes"]["Row"];
export type Evento = Database["public"]["Tables"]["eventos"]["Row"];
export type WhatsappTemplate = Database["public"]["Tables"]["whatsapp_templates"]["Row"];
export type ComunicacaoLog = Database["public"]["Tables"]["comunicacoes_log"]["Row"];
export type Honorario = Database["public"]["Tables"]["honorarios"]["Row"];
export type Parcela = Database["public"]["Tables"]["parcelas"]["Row"];
export type AuditLog = Database["public"]["Tables"]["audit_log"]["Row"];

// Extended types with relations
export type ClienteComProcessos = Cliente & {
  processos_count?: number;
};

export type ProcessoComClientes = Processo & {
  clientes?: { cliente: Cliente; papel: string }[];
  area?: { nome: string };
  advogado?: Pick<Usuario, "id" | "nome">;
};

export type HonorarioComParcelas = Honorario & {
  parcelas?: Parcela[];
  cliente?: Pick<Cliente, "id" | "nome">;
  processo?: Pick<Processo, "id" | "numero_cnj">;
};

// Dashboard KPIs
export type DashboardKPIs = {
  totalClientes: number;
  processosAtivos: number;
  honorariosAReceber: number;
  prazosCriticos: number;
  prazosHoje: number;
  prazosAmanha: number;
  audienciasSemana: number;
  audienciasAmanha: number;
  audienciasVirtuais: number;
};

// Pagination
export type PaginatedResult<T> = {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
};
