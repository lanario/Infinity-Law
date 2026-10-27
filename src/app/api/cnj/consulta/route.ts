import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/server/current-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { DataJudAdapter } from "@/lib/cnj/DataJudAdapter";
import { validateCNJ } from "@/lib/cnj/cnj-validator";
import {
  dataJudUpstreamFailureMessage,
  describeFailureForLog,
  PERSISTENCE_FAILURE_MESSAGE,
} from "@/lib/cnj/datajud-error.mjs";

const bodySchema = z.object({
  numeroCNJ: z.string(),
  processoId: z.string().uuid().optional(),
});

const CACHE_THRESHOLD_HOURS = 6;

// DataJud tem orçamento de 50s (DATAJUD_TOTAL_BUDGET_MS); margem para auth e escrita no banco. 60s = limite do plano Hobby.
export const maxDuration = 60;

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

  let resultado;
  try {
    resultado = await adapter.consultarPorNumero(normalized);
  } catch (error) {
    console.error("[CNJ consulta] falha", describeFailureForLog("datajud", error));
    try {
      await createAdminClient().from("cnj_sync_errors").insert({
        numero_cnj: normalized,
        mensagem: "Erro ao consultar DataJud",
      });
    } catch (logError) {
      console.error("[CNJ consulta] Falha ao registrar cnj_sync_errors:", describeFailureForLog("persistencia", logError));
    }
    return NextResponse.json(
      { error: dataJudUpstreamFailureMessage(error as { status?: number; kind?: string }) },
      { status: 503 }
    );
  }

  if (!resultado) {
    return NextResponse.json({ error: "Processo não encontrado no DataJud" }, { status: 404 });
  }

  // Atualiza cache no banco se processoId fornecido; falha aqui não descarta os dados já obtidos.
  if (processoConfirmado && escritorioId) {
    try {
      const adminClient = createAdminClient();
      // Primeira sincronização: nada é "novo". Re-sync: visto_em omitido (linha nova fica null; existente mantém o valor).
      const primeiraSync = !processoConfirmado.ultima_sync_cnj;
      const agora = new Date().toISOString();
      const linhas = resultado.movimentacoes.map((m) => ({
        processo_id: processoConfirmado.id,
        escritorio_id: escritorioId,
        data_movimento: m.data.split("T")[0] ?? m.data,
        descricao: m.descricao,
        codigo_cnj: m.codigo ?? null,
        fonte: "datajud",
        data_hora: m.data_hora ?? null,
        complementos: m.complementos ?? null,
        ...(primeiraSync ? { visto_em: agora } : {}),
      }));
      const gravarMovimentacoes = async () => {
        const r = await adminClient.from("processo_movimentacoes").upsert(linhas, { onConflict: "processo_id,data_movimento,descricao" });
        // shortcut: 42703/PGRST204 = migration 20261027180000 pendente; regrava sem colunas novas. Remover após aplicar.
        if (r.error && (r.error.code === "42703" || r.error.code === "PGRST204")) {
          console.warn("[CNJ consulta] Migration 20261027180000 pendente; detalhes das movimentações não gravados.");
          return adminClient.from("processo_movimentacoes").upsert(
            linhas.map(({ data_hora: _h, complementos: _c, ...resto }) => {
              const base: Record<string, unknown> = { ...resto };
              delete base.visto_em;
              return base;
            }),
            { onConflict: "processo_id,data_movimento,descricao" }
          );
        }
        return r;
      };
      const [upd, ups] = await Promise.all([
        adminClient
          .from("processos")
          .update({ ultima_sync_cnj: new Date().toISOString() })
          .eq("id", processoConfirmado.id)
          .eq("escritorio_id", escritorioId),
        gravarMovimentacoes(),
      ]);
      if (upd.error || ups.error) throw upd.error ?? ups.error;
    } catch (error) {
      console.error("[CNJ consulta] falha", describeFailureForLog("persistencia", error));
      return NextResponse.json({
        source: "datajud",
        resultado,
        aviso: PERSISTENCE_FAILURE_MESSAGE,
      });
    }
  }

  return NextResponse.json({ source: "datajud", resultado });
}
