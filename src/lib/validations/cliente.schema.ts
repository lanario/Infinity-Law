import { z } from "zod";

function validarCPF(cpf: string): boolean {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(d[i]!) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(d[9]!)) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(d[i]!) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(d[10]!);
}

function validarCNPJ(cnpj: string): boolean {
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const calc = (digits: string, weights: number[]) =>
    digits.split("").reduce((acc, n, i) => acc + parseInt(n) * weights[i]!, 0);
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const r1 = calc(d.slice(0, 12), w1) % 11;
  const d1 = r1 < 2 ? 0 : 11 - r1;
  const r2 = calc(d.slice(0, 13), w2) % 11;
  const d2 = r2 < 2 ? 0 : 11 - r2;
  return d1 === parseInt(d[12]!) && d2 === parseInt(d[13]!);
}

export const clienteSchema = z.object({
  tipo: z.enum(["pf", "pj"]),
  nome: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  cpf_cnpj: z
    .string()
    .optional()
    .transform((v) => v?.replace(/\D/g, "") ?? "")
    .refine((v) => !v || v.length === 0 || v.length === 11 || v.length === 14, {
      message: "CPF deve ter 11 dígitos e CNPJ 14",
    }),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  telefone: z
    .string()
    .optional()
    .transform((v) => v?.replace(/\D/g, "") ?? ""),
  cep: z
    .string()
    .optional()
    .transform((v) => v?.replace(/\D/g, "") ?? "")
    .refine((v) => !v || v.length === 8, {
      message: "CEP deve conter 8 dígitos",
    }),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().max(2).optional(),
  observacoes: z.string().optional(),
  ativo: z.boolean().default(true),
}).superRefine((data, ctx) => {
  if (!data.cpf_cnpj) return;
  if (data.tipo === "pf" && !validarCPF(data.cpf_cnpj)) {
    ctx.addIssue({ code: "custom", message: "CPF inválido", path: ["cpf_cnpj"] });
  }
  if (data.tipo === "pj" && !validarCNPJ(data.cpf_cnpj)) {
    ctx.addIssue({ code: "custom", message: "CNPJ inválido", path: ["cpf_cnpj"] });
  }
});

export type ClienteInput = z.infer<typeof clienteSchema>;
