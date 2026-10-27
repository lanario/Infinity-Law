import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/server/current-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { DataJudAdapter } from "@/lib/cnj/DataJudAdapter";
import { validateCNJ } from "@/lib/cnj/cnj-validator";

const bodySchema = z.object({
  numeroCNJ: z.string(),
  processoId: z.string().uuid().optional(),
});

const CACHE_THRESHOLD_HOURS = 6;

// DataJud tem orçamento de 9s (DataJudAdapter); margem para auth e escrita no banco.
export const maxDuration = 15;

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const profile = await getCurrentProfile().catch((error) => {
    console.error("[CNJ consulta] Falha ao carregar perfil:", error);
    return null;
  });
  if (!profile?.can("processos", "write")) {
    return NextResponse.json({ error: "Sem permissão para consultar processos" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { numeroCNJ, processoId } = parsed.data;

  // Valida formato antes de qualquer chamada externa ou consulta ao banco.
  const { valid, normalized } = validateCNJ(numeroCNJ);
  if (!valid || !normalized) {
    return NextResponse.json(
      { error: "Número CNJ inválido. Use o formato: NNNNNNN-DD.AAAA.J.TT.OOOO" },
      { status: 400 }
    );
  }

  let escritorioId: string | null = null;
  let processoConfirmado: {
    id: string;
    escritorio_id: string;
    ultima_sync_cnj: string | null;
  } | null = null;

  // Confirma o processo com a sessão do usuário antes de qualquer escrita privilegiada.
  if (processoId) {
    const { data: escritorioData, error: escritorioError } = await supabase.rpc("my_escritorio_id");
    if (!escritorioError && typeof escritorioData === "string" && escritorioData.length > 0) {
      escritorioId = escritorioData;
      const { data: processo, error: processoError } = await supabase
        .from("processos")
        .select("id, escritorio_id, numero_cnj, ultima_sync_cnj")
        .eq("id", processoId)
        .eq("escritorio_id", escritorioId)
        .maybeSingle();
      const processoCnj = processo?.numero_cnj ? validateCNJ(processo.numero_cnj) : null;

      if (
        !processoError &&
        processo?.id === processoId &&
        processo.escritorio_id === escritorioId &&
        processoCnj?.valid &&
        processoCnj.normalized === normalized
      ) {
        processoConfirmado = {
          id: processo.id,
          escritorio_id: processo.escritorio_id,
          ultima_sync_cnj: processo.ultima_sync_cnj,
        };
      }
    }
  }

  // Verifica cache — se ultima_sync_cnj < threshold, serve do banco
  if (processoConfirmado && escritorioId) {
    if (processoConfirmado.ultima_sync_cnj) {
      const syncAge =
        (Date.now() - new Date(processoConfirmado.ultima_sync_cnj).getTime()) / (1000 * 60 * 60);

      if (syncAge < CACHE_THRESHOLD_HOURS) {
        const { data: movimentacoes } = await supabase
          .from("processo_movimentacoes")
          .select("*")
          .eq("processo_id", processoConfirmado.id)
          .eq("escritorio_id", escritorioId)
          .order("data_movimento", { ascending: false })
          .limit(50);

        return NextResponse.json({
          source: "cache",
          lastSync: processoConfirmado.ultima_sync_cnj,
          movimentacoes: movimentacoes ?? [],
        });
      }
    }
  }

  // Chama DataJud via Adapter (nunca do client)
  const apiKey = process.env.CNJ_DATAJUD_API_KEY;
  const baseUrl = process.env.CNJ_DATAJUD_BASE_URL;

  if (!apiKey || !baseUrl) {
    return NextResponse.json(
      { error: "Integração CNJ não configurada" },
      { status: 503 }
    );
  }

  const adapter = new DataJudAdapter({ apiKey, baseUrl });

  try {
    const resultado = await adapter.consultarPorNumero(normalized);

    if (!resultado) {
      return NextResponse.json(
        { error: "Processo não encontrado no DataJud" },
        { status: 404 }
      );
    }

    // Atualiza cache no banco se processoId fornecido
    if (processoConfirmado && escritorioId) {
      const adminClient = createAdminClient();
      await Promise.all([
        adminClient
          .from("processos")
          .update({ ultima_sync_cnj: new Date().toISOString() })
          .eq("id", processoConfirmado.id)
          .eq("escritorio_id", escritorioId),
        adminClient.from("processo_movimentacoes").upsert(
          resultado.movimentacoes.map((m) => ({
            processo_id: processoConfirmado.id,
            escritorio_id: escritorioId,
            data_movimento: m.data.split("T")[0] ?? m.data,
            descricao: m.descricao,
            codigo_cnj: m.codigo ?? null,
            fonte: "datajud",
          })),
          { onConflict: "processo_id,data_movimento,descricao" }
        ),
      ]);
    }

    return NextResponse.json({ source: "datajud", resultado });
  } catch {
    // Log do erro de sync
    try {
      const adminClient = createAdminClient();
      await adminClient.from("cnj_sync_errors").insert({
        numero_cnj: normalized,
        mensagem: "Erro ao consultar DataJud",
      });
    } catch (logError) {
      console.error("[CNJ consulta] Falha ao registrar cnj_sync_errors:", logError);
    }

    return NextResponse.json(
      { error: "Falha ao consultar API do CNJ. Tente novamente em alguns minutos." },
      { status: 503 }
    );
  }
}
