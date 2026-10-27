import { z } from "zod";
import { isValidCNJ } from "@/lib/utils";

export const processoSchema = z.object({
  numero_cnj: z
    .string()
    .nullable()
    .optional()
    .refine((value) => !value || isValidCNJ(value), "Formato inválido. Use: NNNNNNN-DD.AAAA.J.TT.OOOO"),
  numero_cnj_raw: z.string().nullable().optional(),
  area_direito_id: z.number().int().positive().optional().nullable(),
  grupo_acao: z.enum(["contencioso", "consultivo", "administrativo", "extrajudicial"]),
  tipo_acao: z.string().trim().min(1, "Tipo de ação é obrigatório").max(120),
  fase: z
    .enum([
      "negociacao",
      "extrajudicial",
      "conhecimento",
      "recursal",
      "execucao",
      "cumprimento_sentenca",
      "liquidacao",
      "arquivado",
    ]),
  etapa: z.string().trim().min(1, "Etapa é obrigatória").max(120),
  status: z.enum(["ativo", "suspenso", "arquivado", "encerrado"]).default("ativo"),
  tribunal: z.string().nullable().optional(),
  vara: z.string().nullable().optional(),
  comarca: z.string().nullable().optional(),
  uf: z.string().max(2).optional().nullable(),
  classe_processual: z.string().nullable().optional(),
  numero_protocolo: z.string().trim().max(100).optional().nullable(),
  processo_originario: z.string().trim().max(100).optional().nullable(),
  pasta_caso: z.string().trim().max(160).optional().nullable(),
  data_requerimento: z.string().date().optional().nullable(),
  valor_causa: z.number().nonnegative().optional().nullable(),
  valor_honorarios: z.number().nonnegative().optional().nullable(),
  percentual_honorarios: z.number().min(0).max(100).optional().nullable(),
  contingenciamento: z.enum(["nao", "parcial", "integral"]).optional().nullable(),
  data_distribuicao: z.string().date().optional().nullable(),
  consulta_cnj: z.boolean().optional(),
  movimentacoes: z
    .array(
      z.object({
        data: z.string().min(1),
        descricao: z.string().min(1),
        codigo: z.string().optional(),
      })
    )
    .optional(),
  advogado_id: z.string().uuid().optional().nullable(),
  observacoes: z.string().trim().max(5000).optional().nullable(),
  clientes: z
    .array(
      z.object({
        cliente_id: z.string().uuid(),
        papel: z.enum(["autor", "reu", "terceiro"]).default("autor"),
      })
    )
    .min(1, "Selecione ao menos um cliente"),
}).superRefine((value, context) => {
  const ids = value.clientes.map((cliente) => cliente.cliente_id);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Remova clientes duplicados da lista de partes." });
  }
});

export type ProcessoInput = z.infer<typeof processoSchema>;
