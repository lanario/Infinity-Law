import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/server/current-profile";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Header } from "@/components/layout/header";
import { ProcessoSyncButton } from "@/components/processos/processo-sync-button";
import { ChevronLeft, Calendar, MapPin, Scale, User, BriefcaseBusiness, FolderKanban, CircleDollarSign, FileText } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { Metadata } from "next";

interface PageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return { title: `Processo ${params.id.slice(0, 8)}...` };
}

const STATUS_BADGE: Record<string, string> = {
  ativo: "bg-emerald-50 text-emerald-700 border-emerald-200",
  suspenso: "bg-amber-50 text-amber-700 border-amber-200",
  arquivado: "bg-gray-50 text-gray-500 border-gray-200",
  encerrado: "bg-blue-50 text-blue-700 border-blue-200",
};

export default async function ProcessoDetailPage({ params }: PageProps) {
  const supabase = createClient();

  const profile = await getCurrentProfile().catch((error) => {
    console.error("[ProcessoDetailPage] Falha ao carregar perfil:", error);
    return "error" as const;
  });
  if (profile === "error") {
    return (
      <div>
        <Header title="Detalhes do Processo" />
        <div className="p-4 sm:p-6"><QueryErrorState retryHref={`/processos/${params.id}`} /></div>
      </div>
    );
  }
  if (!profile) redirect("/login");
  if (!profile.can("processos", "read")) redirect("/dashboard");
  const canReadFinanceiro = profile.can("financeiro", "read");

  // Queries independentes em paralelo; notFound só depois (RLS devolve null para processo de outro tenant).
  const [{ data: processo }, { data: movimentacoes }, { data: clienteVinculos }, { data: honorario }] = await Promise.all([
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
    supabase
      .from("processo_movimentacoes")
      .select("id, data_movimento, descricao, codigo_cnj, fonte")
      .eq("processo_id", params.id)
      .order("data_movimento", { ascending: false })
      .limit(100),
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
  ]);

  if (!processo) notFound();

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

  const syncDate = processo.ultima_sync_cnj
    ? new Date(processo.ultima_sync_cnj)
    : null;
  const isStale =
    !syncDate || Date.now() - syncDate.getTime() > 48 * 60 * 60 * 1000;

  return (
    <div>
      <Header title="Detalhes do Processo" />
      <div className="p-6 space-y-6 max-w-4xl">

        {/* Breadcrumb */}
        <Link
          href="/processos"
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Voltar para Processos
        </Link>

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
            <InfoItem icon={<FolderKanban className="h-3.5 w-3.5" />} label="Etapa" value={processo.etapa?.replaceAll("_", " ")} />
            <InfoItem icon={<FolderKanban className="h-3.5 w-3.5" />} label="Número do protocolo/requerimento" value={processo.numero_protocolo} />
            <InfoItem icon={<FolderKanban className="h-3.5 w-3.5" />} label="Processo originário" value={processo.processo_originario} />
            <InfoItem icon={<FolderKanban className="h-3.5 w-3.5" />} label="Pasta / caso" value={processo.pasta_caso} />
            <InfoItem
              icon={<Calendar className="h-3.5 w-3.5" />}
              label="Data do requerimento"
              value={processo.data_requerimento ? new Date(`${processo.data_requerimento}T12:00:00`).toLocaleDateString("pt-BR") : null}
            />
            <InfoItem
              icon={<CircleDollarSign className="h-3.5 w-3.5" />}
              label="Valor da causa"
              value={processo.valor_causa != null ? formatCurrency(Number(processo.valor_causa)) : null}
            />
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
              Movimentações ({movimentacoes?.length ?? 0})
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Dados públicos via CNJ — pode haver delay de até 12h
            </p>
          </div>

          {!movimentacoes || movimentacoes.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Calendar className="h-8 w-8 text-gray-200 mx-auto mb-2" aria-hidden="true" />
              <p className="text-sm text-gray-400">
              {processo.numero_cnj ? "Nenhuma movimentação registrada. Sincronize com o CNJ." : "As movimentações ficarão disponíveis quando o número CNJ for informado."}
              </p>
            </div>
          ) : (
            <ol className="divide-y divide-gray-50">
              {movimentacoes.map((mov) => (
                <li key={mov.id} className="px-6 py-4 flex gap-4">
                  <div className="flex-shrink-0 mt-0.5">
                    <span className="h-2 w-2 rounded-full bg-gold/60 block mt-1.5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-xs font-medium text-gray-500">
                        {mov.data_movimento
                          ? new Date(mov.data_movimento + "T12:00:00").toLocaleDateString("pt-BR")
                          : "—"}
                      </p>
                      {mov.codigo_cnj && (
                        <span className="text-[10px] text-gray-300 font-mono">
                          #{mov.codigo_cnj}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {mov.descricao}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
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
