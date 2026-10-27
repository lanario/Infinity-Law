import { z } from "zod";

export const lancamentoFinanceiroSchema = z.object({
  tipo: z.enum(["receita", "despesa"]),
  descricao: z.string().trim().min(2, "Informe uma descrição.").max(160),
  categoria: z.string().trim().min(2, "Selecione uma categoria.").max(60),
  valor: z.number().positive("O valor deve ser maior que zero.").max(999_999_999),
  vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida."),
  status: z.enum(["pendente", "pago"]),
  cliente_id: z.string().uuid().nullable(),
});

export type LancamentoFinanceiroInput = z.infer<typeof lancamentoFinanceiroSchema>;
