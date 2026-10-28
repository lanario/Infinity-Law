import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/server/current-profile";

export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "no-store" };
const SOURCE_LIMIT = 12;
const MAX_NOTIFICATIONS = 24;

export async function GET() {
  try {
    return await handleGet();
  } catch (error) {
    console.error("[api/notificacoes] Falha inesperada:", error);
    return NextResponse.json({ error: "Não foi possível carregar as notificações." }, { status: 500, headers: NO_STORE });
  }
}

async function handleGet() {
  const supabase = createClient();
  // Perfil (cargo/permissões) numa única consulta, em vez de getUser + 2 RPCs has_permission. RLS segue valendo nas consultas abaixo.
  const profile = await getCurrentProfile();

  if (!profile) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401, headers: { "cache-control": "no-store" } });
  }

  const agendaPermission = { data: profile.can("agenda", "read") };
  const communicationPermission = { data: profile.can("comunicacao", "read") };
  const processPermission = { data: profile.can("processos", "read") };

  const now = new Date();
  const nowIso = now.toISOString();
  const horizonIso = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const recentIso = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [eventsResult, publicationsResult, processEventsResult] = await Promise.all([
    agendaPermission.data
      ? supabase
          .from("eventos")
          .select("id, titulo, tipo, inicio, local")
          .gte("inicio", nowIso)
          .lte("inicio", horizonIso)
          .order("inicio", { ascending: true })
          .limit(SOURCE_LIMIT)
      : Promise.resolve({ data: [], error: null }),
    communicationPermission.data
      ? supabase
          .from("djen_publicacoes")
          .select("id, numero_processo_com_mascara, numero_processo, tribunal, tipo_comunicacao, nome_classe, created_at")
          .gte("created_at", recentIso)
          .order("created_at", { ascending: false })
          .limit(SOURCE_LIMIT)
      : Promise.resolve({ data: [], error: null }),
    processPermission.data
      ? supabase
          .from("processo_eventos")
          .select("id, processo_id, titulo, descricao, data_evento")
          .gte("data_evento", recentIso)
          .order("data_evento", { ascending: false })
          .limit(SOURCE_LIMIT)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const processEventsSchemaUnavailable = Boolean(
    processEventsResult.error &&
      ["42P01", "PGRST205", "PGRST204"].includes(processEventsResult.error.code ?? "")
  );

  if (processEventsSchemaUnavailable) {
    console.warn("[api/notificacoes] Esquema de eventos de processos indisponível; notificações de processos foram omitidas.");
  }

  if (eventsResult.error || publicationsResult.error || (processEventsResult.error && !processEventsSchemaUnavailable)) {
    console.error(
      "[api/notificacoes] Falha ao consultar atualizações:",
      eventsResult.error ?? publicationsResult.error ?? (processEventsSchemaUnavailable ? null : processEventsResult.error)
    );
    return NextResponse.json({ error: "Não foi possível carregar as notificações." }, { status: 500, headers: { "cache-control": "no-store" } });
  }

  const eventLabels: Record<string, string> = {
    prazo: "Prazo próximo",
    audiencia: "Audiência próxima",
    reuniao: "Reunião próxima",
    compromisso: "Compromisso próximo",
  };
  const notifications = [
    ...(eventsResult.data ?? []).map((event) => ({
      id: `agenda:${event.id}`,
      kind: "agenda" as const,
      title: `${eventLabels[event.tipo] ?? "Evento próximo"}: ${event.titulo}`,
      description: event.local ? `Local: ${event.local}` : "Confira os detalhes na agenda do escritório.",
      date: event.inicio,
      href: "/agenda",
      sortGroup: 0,
    })),
    ...(processEventsSchemaUnavailable ? [] : processEventsResult.data ?? []).map((event) => ({
      id: `processo:${event.id}`,
      kind: "processo" as const,
      title: event.titulo,
      description: event.descricao,
      date: event.data_evento,
      href: `/processos/${event.processo_id}`,
      sortGroup: 1,
    })),
    ...(publicationsResult.data ?? []).map((publication) => ({
      id: `intimacao:${publication.id}`,
      kind: "intimacao" as const,
      title: publication.tipo_comunicacao || publication.nome_classe || "Nova publicação do DJEN",
      description: [
        publication.numero_processo_com_mascara || publication.numero_processo,
        publication.tribunal,
      ].filter(Boolean).join(" · ") || "Uma nova publicação foi registrada no escritório.",
      date: publication.created_at,
      href: "/intimacoes",
      sortGroup: 1,
    })),
  ].sort((left, right) => left.sortGroup - right.sortGroup || (left.sortGroup === 0
    ? new Date(left.date).getTime() - new Date(right.date).getTime()
    : new Date(right.date).getTime() - new Date(left.date).getTime()))
    .slice(0, MAX_NOTIFICATIONS)
    .map(({ sortGroup: _sortGroup, ...notification }) => notification);

  return NextResponse.json(
    { notifications },
    { headers: { "cache-control": "no-store" } }
  );
}
