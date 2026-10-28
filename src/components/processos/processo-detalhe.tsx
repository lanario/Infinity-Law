import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/server/current-profile";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Header } from "@/components/layout/header";
import { ProcessoSyncButton } from "@/components/processos/processo-sync-button";
import { ChevronLeft, Calendar, MapPin, Scale, User, BriefcaseBusiness, FolderKanban, CircleDollarSign, FileText } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { MarcarMovimentacoesVistas } from "@/components/processos/marcar-movimentacoes-vistas";
import { movimentoEmDestaque } from "@/lib/processos/movimento-destaque.mjs";
import { AvisoCriado } from "@/components/processos/aviso-criado";
import { ProcessoDetalheDialog } from "@/components/processos/processo-detalhe-dialog";

const STATUS_BADGE: Record<string, string> = {
  ativo: "bg-emerald-50 text-emerald-700 border-emerald-200",
  suspenso: "bg-amber-50 text-amber-700 border-amber-200",
  arquivado: "bg-gray-50 text-gray-500 border-gray-200",
  encerrado: "bg-blue-50 text-blue-700 border-blue-200",
};

const dataHoraFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

type Complemento = { nome: string; descricao?: string };
function listaComplementos(value: unknown): Complemento[] {
  return Array.isArray(value) ? value.filter((c): c is Complemento => typeof c?.nome === "string") : [];
}

const POLO_LABEL: Record<string, string> = { autor: "Ativo (autor)", reu: "Passivo (réu)", terceiro: "Terceiro interessado" };

// embedded=true: renderizado dentro do modal interceptado (sem Header/breadcrumb, notFound vira estado amigável).
export async function ProcessoDetalhe({
  params,
  searchParams,
  embedded = false,
}: {
  params: { id: string };
  searchParams?: { criado?: string };
  embedded?: boolean;
}) {
  const emModal = (titulo: string, corpo: React.ReactElement): React.ReactElement =>
    embedded ? <ProcessoDetalheDialog titulo={titulo} id={params.id}>{corpo}</ProcessoDetalheDialog> : corpo;

  const supabase = createClient();

  const profile = await getCurrentProfile().catch((error) => {
    console.error("[ProcessoDetailPage] Falha ao carregar perfil:", error);
    return "error" as const;
  });
  if (profile === "error") {
    return emModal(
      "Processo",
      <div>
        {!embedded && <Header title="Detalhes do Processo" />}
        <div className="p-4 sm:p-6"><QueryErrorState retryHref={`/processos/${params.id}`} /></div>
      </div>,
    );
  }
  if (!profile) redirect("/login");
  if (!profile.can("processos", "read")) redirect("/dashboard");
  const canReadFinanceiro = profile.can("financeiro", "read");

  // Queries independentes em paralelo; notFound só depois (RLS devolve null para processo de outro tenant).
  const buscarMovimentacoes = async () => {
    const base = supabase.from("processo_movimentacoes");
    const completo = await base
      .select("id, data_movimento, descricao, codigo_cnj, fonte, data_hora, complementos, visto_em")
      .eq("processo_id", params.id)
      .order("data_hora", { ascending: false, nullsFirst: false })
      .order("data_movimento", { ascending: false })
      .limit(100);
    if (!completo.error) return completo.data;
    // Migration 20261027180000 pendente: lista sem as colunas novas.
    const { data } = await supabase
      .from("processo_movimentacoes")
      .select("id, data_movimento, descricao, codigo_cnj, fonte")
      .eq("processo_id", params.id)
      .order("data_movimento", { ascending: false })
      .limit(100);
    return (data ?? []).map((m) => ({ ...m, data_hora: null, complementos: null, visto_em: "" as string | null }));
  };

  const [{ data: processo }, movimentacoes, { data: clienteVinculos }, { data: honorario }, { data: juridico }] = await Promise.all([
    supabase
      .from("processos")
      .select(`
        numero_cnj, numero_protocolo, pasta_caso, processo_originario, classe_processual,
        grupo_acao, tipo_acao, status, fase, etapa, tribunal, vara, uf, valor_causa,
        data_requerimento, observacoes, ultima_sync_cnj,
        areas_direito ( nome ),
        usuarios!advogado_id ( nome )
      `)
      .eq("id", params.id)
      .single(),
    buscarMovimentacoes(),
    supabase
      .from("processo_clientes")
      .select("papel, clientes ( id, nome )")
      .eq("processo_id", params.id),
    canReadFinanceiro
      ? supabase
          .from("honorarios")
          .select("valor_fixo, percentual_exito, contingenciamento")
          .eq("processo_id", params.id)
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    // Colunas da migration 20261027120000, em query separada: se ainda não existirem, a página segue sem elas.
    supabase
      .from("processos")
      .select("comarca, assunto, grau, sistema, nivel_sigilo, parte_contraria, advogado_parte_contraria")
      .eq("id", params.id)
      .maybeSingle(),
  ]);

  if (!processo) {
    if (!embedded) notFound();
    return emModal(
      "Processo não encontrado",
      <p className="p-6 text-sm text-gray-500">Este processo não existe ou você não tem acesso a ele.</p>,
    );
  }

  const clientes = (clienteVinculos ?? []).flatMap((vinculo) => {
    const cliente = Array.isArray(vinculo.clientes) ? vinculo.clientes[0] : vinculo.clientes;
    return cliente ? [{ ...cliente, papel: vinculo.papel }] : [];
  });

  const area = Array.isArray(processo.areas_direito)
    ? processo.areas_direito[0]?.nome
    : (processo.areas_direito as { nome: string } | null)?.nome;

  const advogado = Array.isArray(processo.usuarios)
    ? processo.usuarios[0]?.nome
    : (processo.usuarios as { nome: string } | null)?.nome;

  const totalNovos = (movimentacoes ?? []).filter((m) => m.visto_em == null).length;

  const syncDate = processo.ultima_sync_cnj
    ? new Date(processo.ultima_sync_cnj)
    : null;
  const isStale =
    !syncDate || Date.now() - syncDate.getTime() > 48 * 60 * 60 * 1000;

  const corpo = (
    <div>
      {!embedded && <Header title="Detalhes do Processo" />}
      <div className={embedded ? "space-y-6 p-4 sm:p-6" : "p-6 space-y-6 max-w-4xl"}>

        {searchParams?.criado === "1" && <AvisoCriado />}

        {/* Breadcrumb */}
        {!embedded && (
          <Link
            href="/processos"
            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Voltar para Processos
          </Link>
        )}

        {juridico && juridico.nivel_sigilo > 0 && (
          <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
            Este processo tem nível de sigilo ({juridico.nivel_sigilo}). Compartilhe as informações com cautela.
          </div>
        )}

        {/* Card principal */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-xs text-gray-400 mb-1">Número CNJ</p>
              <p className="text-lg font-bold font-mono text-gray-900">
                {processo.numero_cnj ?? "CNJ ainda não informado"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "text-xs font-medium px-2.5 py-1 rounded-full border capitalize",
                  STATUS_BADGE[processo.status] ?? "bg-gray-50 text-gray-500 border-gray-200"
                )}
              >
                {processo.status}
              </span>
              {processo.numero_cnj && (
                <ProcessoSyncButton
                  processoId={params.id}
                  numeroCNJ={processo.numero_cnj}
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <InfoItem
              icon={<MapPin className="h-3.5 w-3.5" />}
              label="Tribunal"
              value={processo.tribunal}
            />
            <InfoItem
              icon={<Scale className="h-3.5 w-3.5" />}
              label="Vara / Órgão"
              value={processo.vara}
            />
            <InfoItem
              icon={<Scale className="h-3.5 w-3.5" />}
              label="Área do Direito"
              value={area}
            />
            <InfoItem
              icon={<Scale className="h-3.5 w-3.5" />}
              label="Fase"
              value={processo.fase}
            />
            <InfoItem
              icon={<MapPin className="h-3.5 w-3.5" />}
              label="UF"
              value={processo.uf}
            />
            <InfoItem
              icon={<User className="h-3.5 w-3.5" />}
              label="Advogado Responsável"
              value={advogado}
            />
          </div>

          {processo.observacoes && (
            <div className="mt-4 pt-4 border-t border-gray-50">
              <p className="text-xs text-gray-400 mb-1">Observações</p>
              <p className="text-sm text-gray-600">{processo.observacoes}</p>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isStale ? "bg-amber-400" : "bg-emerald-400"
              )}
              aria-hidden="true"
            />
            <p className="text-xs text-gray-400">
              {syncDate
                ? `Última sincronização: ${syncDate.toLocaleString("pt-BR")}`
                : "Nunca sincronizado com o DataJud"}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-50 px-6 py-4">
            <div className="flex items-center gap-2">
              <BriefcaseBusiness className="h-4 w-4 text-gold" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-gray-800">Dados do pedido</h2>
            </div>
            <p className="mt-1 text-xs text-gray-400">Informações recebidas na abertura e no acompanhamento do caso.</p>
          </div>
          <div className="grid gap-x-6 gap-y-5 p-6 sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem icon={<User className="h-3.5 w-3.5" />} label="Cliente(s)" value={clientes.map((cliente) => cliente.nome).join(", ")} />
            <InfoItem icon={<BriefcaseBusiness className="h-3.5 w-3.5" />} label="Grupo de ação" value={processo.grupo_acao} />
            <InfoItem icon={<Scale className="h-3.5 w-3.5" />} label="Tipo de ação" value={processo.tipo_acao} />
            <InfoItem icon={<FileText className="h-3.5 w-3.5" />} label="Classe processual" value={processo.classe_processual} />
            <InfoItem icon={<FileText className="h-3.5 w-3.5" />} label="Assunto" value={juridico?.assunto} />
            <InfoItem icon={<Scale className="h-3.5 w-3.5" />} label="Grau" value={juridico?.grau} />
            <InfoItem icon={<FolderKanban className="h-3.5 w-3.5" />} label="Sistema" value={juridico?.sistema} />
            <InfoItem icon={<MapPin className="h-3.5 w-3.5" />} label="Comarca" value={juridico?.comarca} />
            <InfoItem icon={<User className="h-3.5 w-3.5" />} label="Polo do cliente" value={clientes.map((c) => POLO_LABEL[c.papel] ?? c.papel).join(", ")} />
            <InfoItem icon={<User className="h-3.5 w-3.5" />} label="Parte contrária" value={juridico?.parte_contraria} />
            <InfoItem icon={<User className="h-3.5 w-3.5" />} label="Advogado da parte contrária" value={juridico?.advogado_parte_contraria} />
            <InfoItem icon={<FolderKanban className="h-3.5 w-3.5" />} label="Etapa" value={processo.etapa?.replaceAll("_", " ")} />
            <InfoItem icon={<FolderKanban className="h-3.5 w-3.5" />} label="Número do protocolo/requerimento" value={processo.numero_protocolo} />
            <InfoItem icon={<FolderKanban className="h-3.5 w-3.5" />} label="Processo originário" value={processo.processo_originario} />
            <InfoItem icon={<FolderKanban className="h-3.5 w-3.5" />} label="Pasta / caso" value={processo.pasta_caso} />
            <InfoItem
              icon={<Calendar className="h-3.5 w-3.5" />}
              label="Data do requerimento"
              value={processo.data_requerimento ? new Date(`${processo.data_requerimento}T12:00:00`).toLocaleDateString("pt-BR") : null}
            />
            {canReadFinanceiro && (
              <InfoItem
                icon={<CircleDollarSign className="h-3.5 w-3.5" />}
                label="Valor da causa"
                value={processo.valor_causa != null ? formatCurrency(Number(processo.valor_causa)) : null}
              />
            )}
            <InfoItem
              icon={<CircleDollarSign className="h-3.5 w-3.5" />}
              label="Valor dos honorários"
              value={honorario?.valor_fixo != null ? formatCurrency(Number(honorario.valor_fixo)) : null}
            />
            <InfoItem
              icon={<FileText className="h-3.5 w-3.5" />}
              label="Percentual de honorários"
              value={honorario?.percentual_exito != null ? `${honorario.percentual_exito}%` : null}
            />
            <InfoItem
              icon={<FileText className="h-3.5 w-3.5" />}
              label="Contingenciamento"
              value={honorario?.contingenciamento === "nao" ? "Não" : honorario?.contingenciamento}
            />
          </div>
        </div>

        {/* Movimentações */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-700">
              Movimentações ({movimentacoes?.length ?? 0}){totalNovos > 0 ? ` · ${totalNovos} nova${totalNovos > 1 ? "s" : ""}` : ""}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Dados públicos via CNJ — pode haver delay de até 12h. Exibindo as 100 mais recentes.
            </p>
            {totalNovos > 0 && <MarcarMovimentacoesVistas processoId={params.id} />}
          </div>

          {!movimentacoes || movimentacoes.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Calendar className="h-8 w-8 text-gray-200 mx-auto mb-2" aria-hidden="true" />
              <p className="text-sm text-gray-400">
              {processo.numero_cnj ? "Nenhuma movimentação registrada. Sincronize com o CNJ." : "As movimentações ficarão disponíveis quando o número CNJ for informado."}
              </p>
            </div>
          ) : (
            <ol className="px-6 py-4">
              {movimentacoes.map((mov, index) => {
                const novo = mov.visto_em == null;
                const destaque = movimentoEmDestaque(mov.descricao);
                const complementos = listaComplementos(mov.complementos);
                const quando = mov.data_hora
                  ? dataHoraFmt.format(new Date(mov.data_hora))
                  : mov.data_movimento
                    ? new Date(mov.data_movimento + "T12:00:00").toLocaleDateString("pt-BR")
                    : "—";
                return (
                  <li key={mov.id} className="flex gap-4">
                    <div className="flex flex-col items-center" aria-hidden="true">
                      <span className={cn("mt-1.5 block h-2.5 w-2.5 rounded-full", destaque ? "bg-gold" : "bg-gray-300")} />
                      {index < movimentacoes.length - 1 && <span className="mt-1 w-px flex-1 bg-gray-100" />}
                    </div>
                    <div className="min-w-0 flex-1 pb-5">
                      <div className="mb-0.5 flex flex-wrap items-center gap-2">
                        <time dateTime={mov.data_hora ?? mov.data_movimento ?? undefined} className="text-xs font-medium text-gray-500">
                          {quando}
                        </time>
                        {novo && (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">Novo</span>
                        )}
                        {mov.codigo_cnj && (
                          <span className="font-mono text-[10px] text-gray-400">#{mov.codigo_cnj}</span>
                        )}
                      </div>
                      <p className={cn("text-sm leading-relaxed", destaque ? "font-semibold text-gray-900" : "text-gray-700")}>
                        {mov.descricao}
                      </p>
                      {complementos.length > 0 && (
                        <p className="mt-0.5 text-xs text-gray-500">
                          {complementos.map((c) => (c.descricao ? `${c.nome}: ${c.descricao}` : c.nome)).join(" · ")}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );

  return emModal(processo.numero_cnj ?? "Processo", corpo);
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 mb-1 text-gray-400">
        {icon}
        <p className="text-[10px] font-medium uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-sm font-medium text-gray-700">{value || "—"}</p>
    </div>
  );
}
