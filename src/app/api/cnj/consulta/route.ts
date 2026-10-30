export const dynamic = "force-dynamic";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/server/current-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { DataJudAdapter } from "@/lib/cnj/DataJudAdapter";
import { getTribunalEndpoint, validateCNJ } from "@/lib/cnj/cnj-validator";
import {
  dataJudUpstreamFailureMessage,
  describeFailureForLog,
  PERSISTENCE_FAILURE_MESSAGE,
} from "@/lib/cnj/datajud-error.mjs";

const bodySchema = z.object({
  numeroCNJ: z.string(),
  processoId: z.string().uuid().optional(),
});

const CACHE_THRESHOLD_HOURS = 24;

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
  const tribunal = getTribunalEndpoint(normalized);

  let escritorioId: string | null = null;
  let processoConfirmado: {
    id: string;
    escritorio_id: string;
    ultima_sync_cnj: string | null;
  } | null = null;

  // A consulta inicial do formulário não tem processoId e não representa sync de um caso cadastrado.
  if (processoId) {
    const { data: escritorioData, error: escritorioError } = await supabase.rpc("my_escritorio_id");
    if (escritorioError || typeof escritorioData !== "string" || escritorioData.length === 0) {
      return NextResponse.json({ error: "Não foi possível identificar o escritório" }, { status: 403 });
    }
    escritorioId = escritorioData;

    const { data: processo, error: processoError } = await supabase
      .from("processos")
      .select("id, escritorio_id, numero_cnj, ultima_sync_cnj")
      .eq("id", processoId)
      .eq("escritorio_id", escritorioId)
      .eq("status", "ativo")
      .maybeSingle();
    if (processoError) {
      return NextResponse.json({ error: "Não foi possível confirmar o processo" }, { status: 500 });
    }
    if (!processo) {
      return NextResponse.json({ error: "Processo não encontrado neste escritório" }, { status: 404 });
    }

    const processoCnj = processo.numero_cnj ? validateCNJ(processo.numero_cnj) : null;
    if (!processoCnj?.valid || processoCnj.normalized !== normalized) {
      return NextResponse.json({ error: "O CNJ informado não corresponde ao processo" }, { status: 404 });
    }

    processoConfirmado = {
      id: processo.id,
      escritorio_id: processo.escritorio_id,
      ultima_sync_cnj: processo.ultima_sync_cnj,
    };
  }

  // Verifica cache — se ultima_sync_cnj tiver menos de 24h, serve do banco.
  if (processoConfirmado) {
    if (processoConfirmado.ultima_sync_cnj) {
      const syncAge =
        (Date.now() - new Date(processoConfirmado.ultima_sync_cnj).getTime()) / (1000 * 60 * 60);

      if (syncAge < CACHE_THRESHOLD_HOURS) {
        const { data: movimentacoes, error: movimentacoesError } = await supabase
          .from("processo_movimentacoes")
          .select("*")
          .eq("processo_id", processoConfirmado.id)
          .eq("escritorio_id", processoConfirmado.escritorio_id)
          .order("data_movimento", { ascending: false })
          .limit(50);
        if (movimentacoesError) {
          return NextResponse.json({ error: "Não foi possível carregar as movimentações em cache" }, { status: 500 });
        }

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

  let adminClient: ReturnType<typeof createAdminClient> | null = null;
  let claimToken: string | null = null;
  if (processoConfirmado) {
    try {
      adminClient = createAdminClient();
      claimToken = crypto.randomUUID();
      const { data: claimed, error: claimError } = await adminClient.rpc("claim_cnj_sync_process", {
        p_processo_id: processoConfirmado.id,
        p_escritorio_id: processoConfirmado.escritorio_id,
        p_lease_token: claimToken,
        p_lease_seconds: 600,
      });
      if (claimError) throw claimError;
      if (claimed !== true) {
        const { data: claimState, error: claimStateError } = await adminClient
          .from("cnj_sync_process_claims")
          .select("lease_until")
          .eq("processo_id", processoConfirmado.id)
          .eq("escritorio_id", processoConfirmado.escritorio_id)
          .maybeSingle();
        if (claimStateError) throw claimStateError;
        const inProgress = Boolean(claimState?.lease_until && Date.parse(claimState.lease_until) > Date.now());
        return NextResponse.json(
          {
            error: inProgress
              ? "Já existe uma sincronização deste processo em andamento."
              : "Este processo já teve uma tentativa de consulta nas últimas 24 horas.",
            code: inProgress ? "CNJ_SYNC_IN_PROGRESS" : "CNJ_DAILY_COOLDOWN",
          },
          { status: inProgress ? 409 : 429 }
        );
      }
    } catch (error) {
      if (claimToken && adminClient) {
        await releaseProcessClaim(adminClient, processoConfirmado, claimToken);
      }
      console.error("[CNJ consulta] Falha ao reservar processo", describeFailureForLog("persistencia", error));
      return NextResponse.json({ error: "Não foi possível reservar a sincronização do processo" }, { status: 503 });
    }
  }

  try {
    let resultado;
    try {
      resultado = await adapter.consultarPorNumero(normalized, Boolean(processoConfirmado));
    } catch (error) {
      console.error("[CNJ consulta] falha", describeFailureForLog("datajud", error));
      try {
        const loggerClient = adminClient ?? createAdminClient();
        await loggerClient.from("cnj_sync_errors").insert({
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
      // Null é resposta válida sem hits somente para tribunais suportados pelo DataJud.
      // A consulta pré-cadastro não tem processo para atualizar ou colocar em cache.
      if (processoConfirmado && adminClient && tribunal) {
        try {
          const sincronizadoEm = new Date().toISOString();
          const { data: updated, error: updateError } = await adminClient
            .from("processos")
            .update({ ultima_sync_cnj: sincronizadoEm })
            .eq("id", processoConfirmado.id)
            .eq("escritorio_id", processoConfirmado.escritorio_id)
            .eq("status", "ativo")
            .select("id")
            .maybeSingle();
          if (updateError) throw updateError;
          if (!updated) throw new Error("Processo deixou de estar ativo antes da conclusão da sincronização");
        } catch (error) {
          console.error("[CNJ consulta] falha", describeFailureForLog("persistencia", error));
          return NextResponse.json({ error: PERSISTENCE_FAILURE_MESSAGE }, { status: 503 });
        }
      }
      return NextResponse.json({ error: "Processo não encontrado no DataJud" }, { status: 404 });
    }

    if (processoConfirmado && adminClient) {
      try {
        // Primeira sincronização: nada é "novo". Re-sync: visto_em omitido (linha nova fica null; existente mantém o valor).
        const primeiraSync = !processoConfirmado.ultima_sync_cnj;
        const sincronizadoEm = new Date().toISOString();
        const linhas = resultado.movimentacoes.map((m) => ({
          processo_id: processoConfirmado.id,
          escritorio_id: processoConfirmado.escritorio_id,
          data_movimento: m.data.split("T")[0] ?? m.data,
          descricao: m.descricao,
          codigo_cnj: m.codigo ?? null,
          fonte: "datajud",
          data_hora: m.data_hora ?? null,
          complementos: m.complementos ?? null,
          ...(primeiraSync ? { visto_em: sincronizadoEm } : {}),
        }));

        if (linhas.length > 0) {
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
          const { error: upsertError } = await gravarMovimentacoes();
          if (upsertError) throw upsertError;
        }

        // Só marca a sincronização depois que as movimentações foram persistidas.
        const { data: updated, error: updateError } = await adminClient
          .from("processos")
          .update({ ultima_sync_cnj: sincronizadoEm })
          .eq("id", processoConfirmado.id)
          .eq("escritorio_id", processoConfirmado.escritorio_id)
          .eq("status", "ativo")
          .select("id")
          .maybeSingle();
        if (updateError) throw updateError;
        if (!updated) throw new Error("Processo deixou de estar ativo antes da conclusão da sincronização");
      } catch (error) {
        console.error("[CNJ consulta] falha", describeFailureForLog("persistencia", error));
        return NextResponse.json({
          source: "datajud",
          resultado,
          aviso: PERSISTENCE_FAILURE_MESSAGE,
        }, { status: 503 });
      }
    }

    return NextResponse.json({ source: "datajud", resultado });
  } finally {
    if (processoConfirmado && adminClient && claimToken) {
      await releaseProcessClaim(adminClient, processoConfirmado, claimToken);
    }
  }
}

async function releaseProcessClaim(
  adminClient: ReturnType<typeof createAdminClient>,
  processo: { id: string; escritorio_id: string },
  claimToken: string,
): Promise<void> {
  try {
    const { error } = await adminClient.rpc("release_cnj_sync_process", {
      p_processo_id: processo.id,
      p_escritorio_id: processo.escritorio_id,
      p_lease_token: claimToken,
    });
    if (error) console.error("[CNJ consulta] Falha ao liberar reserva do processo", processo.id);
  } catch {
    console.error("[CNJ consulta] Falha ao liberar reserva do processo", processo.id);
  }
}
