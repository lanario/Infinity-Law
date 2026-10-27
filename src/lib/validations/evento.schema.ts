import { z } from "zod";

export function toSafeVideoconfHref(value: string | null | undefined): string | null {
  if (!value) return null;

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

const videoconfUrlSchema = z
  .string()
  .url("URL inválida")
  .refine((value) => toSafeVideoconfHref(value) !== null, "Use uma URL HTTP ou HTTPS");

export const eventoSchema = z.object({
  titulo: z.string().min(2, "Título deve ter ao menos 2 caracteres"),
  tipo: z.enum(["audiencia", "reuniao", "prazo", "compromisso"]),
  descricao: z.string().optional(),
  inicio: z.string().min(1, "Data/hora de início é obrigatória"),
  fim: z.string().optional().nullable(),
  dia_inteiro: z.boolean().default(false),
  processo_id: z.string().uuid().optional().nullable(),
  cliente_id: z.string().uuid().optional().nullable(),
  responsavel_id: z.string().uuid().optional().nullable(),
  local: z.string().optional().nullable(),
  link_videoconf: videoconfUrlSchema.optional().nullable().or(z.literal("")),
});

export type EventoInput = z.infer<typeof eventoSchema>;
