import { createAdminClient } from "@/lib/supabase/admin";
import { headers } from "next/headers";

type AuditAction = "select" | "insert" | "update" | "delete";

interface AuditParams {
  escritorioId: string;
  usuarioId?: string;
  tabela: string;
  registroId?: string;
  acao: AuditAction;
  dadosAnteriores?: Record<string, unknown> | null;
  dadosNovos?: Record<string, unknown> | null;
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    const adminClient = createAdminClient();
    const headersList = headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const userAgent = headersList.get("user-agent") ?? null;

    await adminClient.from("audit_log").insert({
      escritorio_id: params.escritorioId,
      usuario_id: params.usuarioId ?? null,
      tabela: params.tabela,
      registro_id: params.registroId ?? null,
      acao: params.acao,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dados_anteriores: (params.dadosAnteriores ?? null) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dados_novos: (params.dadosNovos ?? null) as any,
      ip_address: ip,
      user_agent: userAgent,
    });
  } catch {
    // Audit failures are non-fatal — log to server console only
    console.error("[audit] Failed to write audit log");
  }
}
