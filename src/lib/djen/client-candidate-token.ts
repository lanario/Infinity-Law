import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import {
  clientCandidateCommunicationSchema,
  type ClientCandidateCommunication,
} from "@/lib/djen/validation";

const TOKEN_TTL_MS = 15 * 60 * 1000;
const MAX_TOKEN_LENGTH = 250_000;

const envelopeSchema = z.object({
  version: z.literal(1),
  consultaId: z.string().uuid(),
  escritorioId: z.string().uuid(),
  clienteId: z.string().uuid(),
  nomeParteConsultado: z.string().trim().min(1).max(300),
  dataInicio: z.string(),
  dataFim: z.string(),
  expiresAt: z.number().int().positive(),
  comunicacao: clientCandidateCommunicationSchema,
});

export type ClientCandidateEnvelope = z.infer<typeof envelopeSchema>;

function signingKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Chave interna indisponível.");
  return key;
}

export function signClientCandidate(input: {
  consultaId: string;
  escritorioId: string;
  clienteId: string;
  nomeParteConsultado: string;
  dataInicio: string;
  dataFim: string;
  comunicacao: ClientCandidateCommunication;
}): string | null {
  const envelope = envelopeSchema.parse({
    ...input,
    version: 1,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  });
  const encoded = Buffer.from(JSON.stringify(envelope), "utf8").toString("base64url");
  const signature = createHmac("sha256", signingKey()).update(encoded).digest("base64url");
  const token = `djen1.${encoded}.${signature}`;
  return token.length <= MAX_TOKEN_LENGTH ? token : null;
}

export function verifyClientCandidate(token: string): ClientCandidateEnvelope | null {
  if (token.length > MAX_TOKEN_LENGTH) return null;

  const [version, encoded, signature, extra] = token.split(".");
  if (
    version !== "djen1" ||
    !encoded ||
    !signature ||
    extra !== undefined ||
    !/^[A-Za-z0-9_-]+$/.test(encoded) ||
    !/^[A-Za-z0-9_-]+$/.test(signature)
  ) {
    return null;
  }

  let expected: Buffer;
  try {
    expected = createHmac("sha256", signingKey()).update(encoded).digest();
  } catch {
    return null;
  }

  const received = Buffer.from(signature, "base64url");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;

  try {
    const decoded = Buffer.from(encoded, "base64url").toString("utf8");
    const parsed = envelopeSchema.safeParse(JSON.parse(decoded));
    if (!parsed.success || parsed.data.expiresAt <= Date.now()) return null;
    return parsed.data;
  } catch {
    return null;
  }
}
