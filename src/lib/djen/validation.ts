import { z } from "zod";

export const BRAZILIAN_UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export const OAB_CNJ_MESSAGE =
  "Isto parece um número de processo (CNJ). Informe o número da OAB do advogado, com a seccional ao lado.";

// Número da OAB: 1 a 7 dígitos com sufixo opcional de uma letra (ex.: 123456, 123456A, 12345N).
// Aceita "12.345" e "123456-A", normalizando para "12345" / "123456A".
const oabNumberFormat = /^\d{1,7}[A-Z]?$/;
const cnjMasked = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/;

export const oabInputSchema = z.object({
  numeroOab: z
    .string()
    .trim()
    .min(1, "Informe o número da OAB.")
    .max(40, "O número da OAB deve ter até 40 caracteres.")
    .transform((value, ctx) => {
      if (cnjMasked.test(value) || value.replace(/\D/g, "").length >= 10) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: OAB_CNJ_MESSAGE });
        return z.NEVER;
      }
      const normalized = value.replace(/[.\s-]/g, "").toUpperCase();
      if (!oabNumberFormat.test(normalized)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Número da OAB inválido. Use apenas dígitos, com letra opcional no final (ex.: 123456 ou 123456A).",
        });
        return z.NEVER;
      }
      return normalized;
    }),
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

// Página de uma consulta paginada: valida status e formato, mas não exige count === items.length
// (count é o total da consulta, não o da página).
export function parseDjenPage(payload: unknown): DjenApiResponse {
  const parsed = responseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("Resposta do DJEN fora do formato esperado.");
  }
  if (parsed.data.status.trim().toLowerCase() !== "success") {
    throw new Error("O DJEN retornou um status desconhecido ou sem sucesso.");
  }
  return parsed.data;
}

export type DjenCollectOptions = {
  maxPages: number;
  maxItems: number;
  /** Instante (Date.now()) após o qual não se busca nova página. */
  deadline: number;
};

/**
 * Percorre pagina=1..N até acumular `count` itens. Falha (sem resultado parcial) se uma página
 * vier vazia antes do total ou não trouxer item novo; devolve truncated=true se bater nos tetos.
 */
export async function collectDjenPages(
  fetchPage: (pagina: number) => Promise<DjenApiResponse>,
  options: DjenCollectOptions
): Promise<{ count: number; items: DjenCommunication[]; truncated: boolean }> {
  const items: DjenCommunication[] = [];
  const seen = new Set<string>();
  let count = 0;

  for (let pagina = 1; pagina <= options.maxPages; pagina++) {
    if (pagina > 1 && Date.now() >= options.deadline) return { count, items, truncated: true };

    const page = await fetchPage(pagina);
    if (pagina === 1) count = page.count;

    if (page.items.length === 0) {
      if (items.length < count) {
        throw new Error("O DJEN retornou página vazia antes do total informado.");
      }
      return { count, items, truncated: false };
    }

    let added = 0;
    for (const item of page.items) {
      items.push(item);
      if (!seen.has(item.hash)) {
        seen.add(item.hash);
        added++;
      }
    }
    if (added === 0) throw new Error("A paginação do DJEN não avançou.");

    if (items.length >= count) return { count, items, truncated: false };
    if (items.length >= options.maxItems) return { count, items, truncated: true };
  }

  return { count, items, truncated: true };
}

/** Falha HTTP do DJEN; carrega só status e página (sem dados da consulta). */
export class DjenHttpError extends Error {
  status: number;
  pagina: number;
  constructor(status: number, pagina: number) {
    super(`DJEN HTTP ${status}`);
    this.status = status;
    this.pagina = pagina;
  }
}

/**
 * Coleta paginada com fallback: se a página 1 paginada falhar com 400, repete UMA vez sem
 * parâmetros de paginação e usa só esse resultado (truncated se count > itens recebidos).
 */
export async function collectDjenWithFallback(
  fetchPage: (pagina: number, paginated: boolean) => Promise<DjenApiResponse>,
  options: DjenCollectOptions,
  onFallback?: () => void
): Promise<{ count: number; items: DjenCommunication[]; truncated: boolean }> {
  try {
    return await collectDjenPages((pagina) => fetchPage(pagina, true), options);
  } catch (error) {
    if (!(error instanceof DjenHttpError) || error.status !== 400 || error.pagina !== 1) throw error;
  }
  onFallback?.();
  const page = await fetchPage(1, false);
  return { count: page.count, items: page.items, truncated: page.items.length < page.count };
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
