import { z } from "zod";

export const BRAZILIAN_UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

const oabCharacters = /^[\p{L}\p{N} .\-/]+$/u;

export const oabInputSchema = z.object({
  numeroOab: z
    .string()
    .trim()
    .min(1, "Informe o número da OAB.")
    .max(40, "O número da OAB deve ter até 40 caracteres.")
    .regex(oabCharacters, "Use apenas letras, números, espaços, ponto, hífen ou barra."),
  ufOab: z.string().trim().toUpperCase().pipe(z.enum(BRAZILIAN_UFS)),
});

export const monitorIdSchema = z.string().uuid();

export const syncInputSchema = z.object({
  monitoramentoId: monitorIdSchema,
  dataInicio: z.string(),
  dataFim: z.string(),
});

const recipientSchema = z.object({
  nome: z.string().nullable().optional(),
  polo: z.string().nullable().optional(),
  comunicacao_id: z.number().nullable().optional(),
});

const communicationSchema = z.object({
  hash: z.string().trim().min(1).max(255),
  nomeParte: z.string().nullable().optional(),
  data_disponibilizacao: z.string().nullable().optional(),
  siglaTribunal: z.string().nullable().optional(),
  tipoComunicacao: z.string().nullable().optional(),
  nomeOrgao: z.string().nullable().optional(),
  texto: z.string().nullable().optional(),
  numero_processo: z.string().nullable().optional(),
  numeroprocessocommascara: z.string().nullable().optional(),
  meio: z.string().nullable().optional(),
  meiocompleto: z.string().nullable().optional(),
  link: z.string().nullable().optional(),
  tipoDocumento: z.string().nullable().optional(),
  nomeClasse: z.string().nullable().optional(),
  codigoClasse: z.string().nullable().optional(),
  numeroComunicacao: z.number().nullable().optional(),
  ativo: z.boolean().nullable().optional(),
  destinatarios: z.array(recipientSchema).nullable().optional(),
  destinatarioadvogados: z.array(z.unknown()).nullable().optional(),
});

export const clientSearchInputSchema = z.object({
  clienteId: z.string().uuid(),
  dataInicio: z.string(),
  dataFim: z.string(),
}).strict();

// Tokens de associação manual não carregam campos arbitrários retornados pelo CNJ.
export const clientCandidateCommunicationSchema = communicationSchema.omit({
  destinatarioadvogados: true,
});

const responseSchema = z.object({
  status: z.string().trim().min(1),
  count: z.number().int().nonnegative(),
  items: z.array(communicationSchema),
});

export type DjenCommunication = z.infer<typeof communicationSchema>;
export type ClientCandidateCommunication = z.infer<typeof clientCandidateCommunicationSchema>;
export type DjenApiResponse = z.infer<typeof responseSchema>;

export function parseDjenResponse(payload: unknown): DjenApiResponse {
  const parsed = responseSchema.safeParse(payload);

  if (!parsed.success) {
    throw new Error("Resposta do DJEN fora do formato esperado.");
  }

  const status = parsed.data.status.trim().toLowerCase();
  if (status !== "success") {
    throw new Error("O DJEN retornou um status desconhecido ou sem sucesso.");
  }

  if (parsed.data.count !== parsed.data.items.length) {
    throw new Error("A quantidade informada pelo DJEN não corresponde aos itens retornados.");
  }

  return parsed.data;
}

export function normalizeCnjNumber(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length === 20 ? digits : null;
}

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateDateRange(
  dataInicio: string,
  dataFim: string,
  today: string
): string | null {
  if (!isCalendarDate(dataInicio) || !isCalendarDate(dataFim)) {
    return "Informe as datas no formato AAAA-MM-DD.";
  }

  if (!isCalendarDate(today)) {
    return "Não foi possível validar a data atual.";
  }

  const start = Date.parse(`${dataInicio}T00:00:00.000Z`);
  const end = Date.parse(`${dataFim}T00:00:00.000Z`);
  const todayValue = Date.parse(`${today}T00:00:00.000Z`);

  if (start > end) return "A data inicial deve ser anterior ou igual à data final.";
  if (end > todayValue) return "A data final não pode estar no futuro.";

  const inclusiveDays = Math.floor((end - start) / 86_400_000) + 1;
  if (inclusiveDays > 30) return "A consulta pode abranger no máximo 30 dias.";

  return null;
}

export function getSaoPauloDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function toDjenDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = value.slice(0, 10);
  return isCalendarDate(date) ? date : null;
}

export function toSafeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;

  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}
