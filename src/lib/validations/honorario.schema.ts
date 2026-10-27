import { z } from "zod";

export const honorarioSchema = z
  .object({
    processo_id: z.string().uuid().optional().nullable(),
    cliente_id: z.string().uuid("Selecione um cliente"),
    tipo: z.enum(["fixo", "exito", "misto"]),
    descricao: z.string().optional(),
    valor_fixo: z.number().positive().optional().nullable(),
    percentual_exito: z
      .number()
      .min(0.01)
      .max(100)
      .optional()
      .nullable(),
    base_calculo_exito: z.string().optional().nullable(),
    // Parcelas (para tipo fixo/misto)
    n_parcelas: z.number().int().min(1).max(120).default(1),
    data_primeira_parcela: z.string().min(1, "Informe a data da primeira parcela"),
  })
  .superRefine((data, ctx) => {
    if (data.tipo === "fixo" || data.tipo === "misto") {
      if (!data.valor_fixo || data.valor_fixo <= 0) {
        ctx.addIssue({
          code: "custom",
          message: "Valor fixo é obrigatório",
          path: ["valor_fixo"],
        });
      }
    }
    if (data.tipo === "exito" || data.tipo === "misto") {
      if (!data.percentual_exito || data.percentual_exito <= 0) {
        ctx.addIssue({
          code: "custom",
          message: "Percentual de êxito é obrigatório",
          path: ["percentual_exito"],
        });
      }
    }
  });

export const parcelaSchema = z.object({
  valor: z.number().positive("Valor deve ser positivo"),
  vencimento: z.string().min(1, "Informe o vencimento"),
  status: z.enum(["pendente", "pago", "vencido", "cancelado"]).default("pendente"),
  data_pagamento: z.string().optional().nullable(),
  forma_pagamento: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

export type HonorarioInput = z.infer<typeof honorarioSchema>;
export type ParcelaInput = z.infer<typeof parcelaSchema>;
