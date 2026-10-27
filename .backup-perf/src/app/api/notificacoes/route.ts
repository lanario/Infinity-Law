import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401, headers: { "cache-control": "no-store" } });
  }

  const [agendaPermission, communicationPermission] = await Promise.all([
    supabase.rpc("has_permission", { modulo: "agenda", acao: "read" }),
    supabase.rpc("has_permission", { modulo: "comunicacao", acao: "read" }),
  ]);

  if (agendaPermission.error || communicationPermission.error) {
    console.error("[api/notificacoes] Falha ao validar permissões:", agendaPermission.error ?? communicationPermission.error);
    return NextResponse.json({ error: "Não foi possível validar o acesso às notificações." }, { status: 500, headers: { "cache-control": "no-store" } });
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const horizonIso = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const recentIso = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [eventsResult, publicationsResult] = await Promise.all([
    agendaPermission.data
      ? supabase
          .from("eventos")
          .select("id, titulo, tipo, inicio, local")
          .gte("inicio", nowIso)
          .lte("inicio", horizonIso)
          .order("inicio", { ascending: true })
          .limit(12)
      : Promise.resolve({ data: [], error: null }),
    communicationPermission.data
      ? supabase
          .from("djen_publicacoes")
          .select("id, numero_processo_com_mascara, numero_processo, tribunal, tipo_comunicacao, nome_classe, created_at")
          .gte("created_at", recentIso)
          .order("created_at", { ascending: false })
          .limit(12)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (eventsResult.error || publicationsResult.error) {
    console.error("[api/notificacoes] Falha ao consultar atualizações:", eventsResult.error ?? publicationsResult.error);
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
    .map(({ sortGroup: _sortGroup, ...notification }) => notification);

  return NextResponse.json(
    { notifications },
    { headers: { "cache-control": "no-store" } }
  );
}
