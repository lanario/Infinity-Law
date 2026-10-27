"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  FolderKanban,
  History,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Scale,
  ShieldCheck,
  UserRound,
  Wallet,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { ClienteDocumentos, type ClienteDocumento } from "@/components/clientes/cliente-documentos";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { Cliente } from "@/types/domain";
import { cn, formatCurrency, formatDocument, formatPhone } from "@/lib/utils";

export type ProntuarioTab = "resumo" | "cadastro" | "processos" | "intimacoes" | "documentos" | "financeiro" | "agenda" | "historico";

type ProcessoFicha = {
  id: string;
  numero_cnj: string | null;
  numero_protocolo: string | null;
  pasta_caso: string | null;
  processo_originario: string | null;
  classe_processual: string | null;
  grupo_acao: string | null;
  tipo_acao: string | null;
  status: string;
  fase: string | null;
  etapa: string | null;
  tribunal: string | null;
  vara: string | null;
  comarca: string | null;
  uf: string | null;
  valor_causa: number | null;
  data_distribuicao: string | null;
  data_requerimento: string | null;
  observacoes: string | null;
  advogado: string | null;
  area: string | null;
  papel: string;
  movimentacoes: Array<{ id: string; data_movimento: string; descricao: string; codigo_cnj: string | null; fonte: string }>;
};

type ParcelaFicha = {
  id: string;
  honorario_id: string;
  numero_parcela: number;
  valor: number;
  vencimento: string;
  status: string;
  data_pagamento: string | null;
  forma_pagamento: string | null;
  observacoes: string | null;
};

type HonorarioFicha = {
  id: string;
  tipo: string;
  status: string;
  descricao: string | null;
  valor_fixo: number | null;
  percentual_exito: number | null;
  base_calculo_exito: string | null;
  processo_id: string | null;
  created_at: string;
  parcelas: ParcelaFicha[];
};

type LancamentoFicha = {
  id: string;
  tipo: string;
  categoria: string;
  descricao: string;
  valor: number;
  vencimento: string;
  status: string;
  data_pagamento: string | null;
};

type EventoFicha = {
  id: string;
  titulo: string;
  tipo: string;
  inicio: string;
  fim: string | null;
  dia_inteiro: boolean;
  processo_id: string | null;
  descricao: string | null;
  local: string | null;
  link_videoconf: string | null;
};

type ComunicacaoFicha = {
  id: string;
  canal: string;
  destinatario: string;
  enviado_em: string;
  mensagem: string;
  status: string;
  processo_id: string | null;
};

type PublicacaoFicha = {
  id: string;
  processo_id: string | null;
  numero_processo: string | null;
  numero_processo_com_mascara: string | null;
  data_disponibilizacao: string | null;
  tribunal: string | null;
  tipo_comunicacao: string | null;
  orgao: string | null;
  texto: string | null;
  link: string | null;
  nome_classe: string | null;
  comunicacao_ativa: boolean | null;
  created_at: string;
};

const ClienteForm = dynamic(() => import("@/components/clientes/cliente-form").then((m) => m.ClienteForm), {
  ssr: false,
  loading: () => <Skeleton className="h-[480px] rounded-2xl motion-reduce:animate-none" />,
});

const TAB_CONFIG: Array<{ id: ProntuarioTab; label: string; icon: typeof UserRound }> = [
  { id: "resumo", label: "Resumo", icon: ShieldCheck },
  { id: "cadastro", label: "Cadastro", icon: UserRound },
  { id: "processos", label: "Processos", icon: BriefcaseBusiness },
  { id: "intimacoes", label: "Intimações", icon: Scale },
  { id: "documentos", label: "Documentos", icon: FileText },
  { id: "financeiro", label: "Financeiro", icon: Wallet },
  { id: "agenda", label: "Agenda", icon: CalendarDays },
  { id: "historico", label: "Histórico", icon: History },
];

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = value.length === 10 ? new Date(`${value}T12:00:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function displayLabel(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Não informado";
}

function statusTone(status: string) {
  if (["ativo", "pago", "realizado", "enviado"].includes(status)) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (["suspenso", "pendente", "agendado", "iniciado"].includes(status)) return "border-amber-200 bg-amber-50 text-amber-800";
  if (["vencido", "cancelado"].includes(status)) return "border-red-200 bg-red-50 text-red-700";
  return "border-stone-200 bg-stone-100 text-stone-600";
}

function Detail({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: typeof UserRound }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-stone-400">
        {Icon && <Icon className="h-3.5 w-3.5 text-gold-dark" aria-hidden="true" />}{label}
      </p>
      <p className="mt-1 break-words text-xs font-semibold leading-relaxed text-stone-700">{value?.trim() || "Não informado"}</p>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, aside }: { title: string; icon: typeof UserRound; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_8px_24px_-20px_rgba(23,25,26,0.4)]">
      <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5"><Icon className="h-4 w-4 shrink-0 text-gold-dark" aria-hidden="true" /><h2 className="truncate text-sm font-black text-[#17191a]">{title}</h2></div>
        {aside}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function EmptyState({ title, description, icon: Icon = FolderKanban }: { title: string; description: string; icon?: typeof UserRound }) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-200 bg-white/70 px-5 py-12 text-center">
      <Icon className="mx-auto h-7 w-7 text-stone-300" aria-hidden="true" />
      <p className="mt-3 text-sm font-bold text-stone-700">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-stone-400">{description}</p>
    </div>
  );
}

function StatCard({ label, value, detail, icon: Icon }: { label: string; value: string | number; detail: string; icon: typeof UserRound }) {
  return (
    <article className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_8px_24px_-20px_rgba(23,25,26,0.4)]">
      <div className="flex items-center justify-between gap-3"><p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">{label}</p><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold-soft text-gold-dark"><Icon className="h-4 w-4" aria-hidden="true" /></span></div>
      <p className="mt-3 text-xl font-black tracking-tight text-[#17191a]">{value}</p>
      <p className="mt-1 text-[10px] text-stone-400">{detail}</p>
    </article>
  );
}

export function ClienteProntuario({
  cliente,
  escritorioId,
  initialTab = "resumo",
  canEdit,
  canReadProcessos,
  canReadFinanceiro,
  canReadAgenda,
  canReadComunicacao,
  processos,
  honorarios,
  lancamentos,
  eventos,
  comunicacoes,
  publicacoes,
  documentos,
  documentosError,
  hasPartialData,
}: {
  cliente: Cliente;
  escritorioId: string;
  initialTab?: ProntuarioTab;
  canEdit: boolean;
  canReadProcessos: boolean;
  canReadFinanceiro: boolean;
  canReadAgenda: boolean;
  canReadComunicacao: boolean;
  processos: ProcessoFicha[];
  honorarios: HonorarioFicha[];
  lancamentos: LancamentoFicha[];
  eventos: EventoFicha[];
  comunicacoes: ComunicacaoFicha[];
  publicacoes: PublicacaoFicha[];
  documentos: ClienteDocumento[];
  documentosError?: string | null;
  hasPartialData: boolean;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ProntuarioTab>(initialTab);
  const initials = cliente.nome.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const processCount = processos.length;
  const activeProcessCount = processos.filter((processo) => !["encerrado", "arquivado"].includes(processo.status)).length;
  const parcelas = honorarios.flatMap((honorario) => honorario.parcelas);
  const totalRecebido = [...parcelas.filter((parcela) => parcela.status === "pago").map((parcela) => parcela.valor), ...lancamentos.filter((lancamento) => lancamento.tipo === "receita" && lancamento.status === "pago").map((lancamento) => lancamento.valor)].reduce((total, value) => total + value, 0);
  const totalEmAberto = [...parcelas.filter((parcela) => ["pendente", "vencido"].includes(parcela.status)).map((parcela) => parcela.valor), ...lancamentos.filter((lancamento) => lancamento.tipo === "receita" && ["pendente", "vencido"].includes(lancamento.status)).map((lancamento) => lancamento.valor)].reduce((total, value) => total + value, 0);
  const now = Date.now();
  const upcomingEvents = eventos.filter((evento) => new Date(evento.inicio).getTime() >= now);
  const nextEvent = upcomingEvents[0];
  const enabledTabs = TAB_CONFIG.filter((tab) => {
    if (tab.id === "processos") return canReadProcessos;
    if (tab.id === "intimacoes") return canReadComunicacao && canReadProcessos;
    if (tab.id === "financeiro") return canReadFinanceiro;
    if (tab.id === "agenda") return canReadAgenda;
    if (tab.id === "historico") return canReadComunicacao || canReadProcessos || canReadAgenda;
    return true;
  });
  const selectedTab = enabledTabs.some((tab) => tab.id === activeTab) ? activeTab : "resumo";

  const processNumberById = new Map(processos.map((processo) => [processo.id, processo.numero_cnj || processo.numero_protocolo || processo.pasta_caso || "Processo"]));
  const activity = [
    ...processos.flatMap((processo) => processo.movimentacoes.map((movimentacao) => ({
      id: `mov-${movimentacao.id}`,
      date: `${movimentacao.data_movimento}T12:00:00`,
      title: "Movimentação processual",
      description: `${processNumberById.get(processo.id)} · ${movimentacao.descricao}`,
      meta: movimentacao.codigo_cnj ? `Código CNJ ${movimentacao.codigo_cnj}` : `Fonte: ${displayLabel(movimentacao.fonte)}`,
      icon: Scale,
    }))),
    ...eventos.map((evento) => ({
      id: `event-${evento.id}`,
      date: evento.inicio,
      title: `${displayLabel(evento.tipo)} · ${evento.titulo}`,
      description: evento.descricao || evento.local || "Compromisso vinculado ao cliente.",
      meta: formatDateTime(evento.inicio),
      icon: CalendarClock,
    })),
    ...(canReadComunicacao ? comunicacoes.map((comunicacao) => ({
      id: `msg-${comunicacao.id}`,
      date: comunicacao.enviado_em,
      title: `${displayLabel(comunicacao.canal)} · ${displayLabel(comunicacao.status)}`,
      description: comunicacao.mensagem,
      meta: processNumberById.get(comunicacao.processo_id ?? "") || comunicacao.destinatario,
      icon: MessageCircle,
    })) : []),
    ...(canReadComunicacao ? publicacoes.map((publicacao) => ({
      id: `publication-${publicacao.id}`,
      date: publicacao.data_disponibilizacao ?? publicacao.created_at,
      title: `${displayLabel(publicacao.tipo_comunicacao ?? "Publicação DJEN")} · ${publicacao.tribunal ?? "Tribunal não informado"}`,
      description: publicacao.texto || publicacao.nome_classe || "Publicação vinculada a processo deste cliente.",
      meta: processNumberById.get(publicacao.processo_id ?? "") || publicacao.numero_processo_com_mascara || publicacao.numero_processo || "Processo vinculado",
      icon: Scale,
    })) : []),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 30);

  function goToTab(tab: ProntuarioTab) {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-screen bg-[#fbfaf8]">
      <Header title="Prontuário do cliente" actions={(
        <Link href="/clientes" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 text-[11px] font-bold text-stone-600 shadow-sm transition hover:border-gold/40 hover:bg-gold-soft hover:text-gold-dark">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /><span className="hidden sm:inline">Clientes</span>
        </Link>
      )} />

      <main className="mx-auto max-w-[1720px] space-y-4 px-3 py-4 sm:space-y-5 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-stone-400">
          <Link href="/clientes" className="transition hover:text-gold-dark">Clientes</Link><span aria-hidden="true">/</span><span className="truncate text-stone-600">{cliente.nome}</span>
        </div>

        {hasPartialData && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">Alguns dados relacionados não puderam ser carregados. As demais áreas do prontuário continuam disponíveis; atualize a página para tentar novamente.</p>}

        <section className="relative overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_12px_36px_-26px_rgba(23,25,26,0.4)]">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-gold-dark via-gold to-gold-soft" aria-hidden="true" />
          <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-3">
            <div className="flex min-w-0 items-center gap-3 sm:flex-1">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold/20 bg-[#17191a] text-sm font-black text-gold shadow-[0_8px_22px_-12px_rgba(156,125,31,0.7)] sm:h-12 sm:w-12">
                {initials || (cliente.tipo === "pj" ? <Building2 className="h-6 w-6" aria-hidden="true" /> : <UserRound className="h-6 w-6" aria-hidden="true" />)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <h2 className="max-w-full truncate text-base font-black tracking-tight text-[#17191a] sm:text-lg">{cliente.nome}</h2>
                  <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold", cliente.ativo ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-stone-200 bg-stone-100 text-stone-500")}>
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" />{cliente.ativo ? "Ativo" : "Arquivado"}
                  </span>
                </div>
                <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] leading-4 text-stone-500 sm:gap-x-3">
                  <span>{cliente.tipo === "pf" ? "Pessoa física" : "Pessoa jurídica"}</span>
                  {cliente.cpf_cnpj && <><span className="text-stone-300" aria-hidden="true">·</span><span className="font-mono">{formatDocument(cliente.cpf_cnpj, cliente.tipo as "pf" | "pj")}</span></>}
                  <span className="text-stone-300" aria-hidden="true">·</span><span>Desde {formatDate(cliente.created_at)}</span>
                  {cliente.telefone && <><span className="text-stone-300" aria-hidden="true">·</span><span className="inline-flex items-center gap-1 whitespace-nowrap"><Phone className="h-3 w-3 text-gold-dark" aria-hidden="true" />{formatPhone(cliente.telefone)}</span></>}
                  {cliente.email && <><span className="text-stone-300" aria-hidden="true">·</span><span className="inline-flex min-w-0 items-center gap-1"><Mail className="h-3 w-3 shrink-0 text-gold-dark" aria-hidden="true" /><span className="truncate">{cliente.email}</span></span></>}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-1.5 pl-14 sm:pl-0">
              {cliente.telefone && <a href={`https://wa.me/55${cliente.telefone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" aria-label="Enviar WhatsApp para o cliente" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[10px] font-bold text-emerald-700 transition hover:bg-emerald-100"><MessageCircle className="h-3.5 w-3.5" aria-hidden="true" /><span className="hidden sm:inline">WhatsApp</span></a>}
              {canEdit && <button type="button" onClick={() => goToTab("cadastro")} aria-label="Editar cadastro do cliente" className="inline-flex h-8 items-center gap-1.5 rounded-lg gold-sheen px-2.5 text-[10px] font-bold text-[#17191a] shadow-sm transition hover:opacity-95"><UserRound className="h-3.5 w-3.5" aria-hidden="true" /><span className="hidden sm:inline">Editar</span></button>}
            </div>
          </div>
        </section>

        <nav aria-label="Seções do prontuário do cliente" className="sticky top-[72px] z-10 -mx-3 overflow-x-auto bg-[#fbfaf8]/90 px-3 py-1 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div role="tablist" className="inline-flex min-w-full gap-1 rounded-2xl border border-stone-200/80 bg-white p-1.5 shadow-[0_8px_24px_-20px_rgba(23,25,26,0.3)] sm:min-w-0 sm:flex sm:flex-wrap">
            {enabledTabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                id={`cliente-tab-${id}`}
                type="button"
                role="tab"
                aria-selected={selectedTab === id}
                aria-controls={`cliente-panel-${id}`}
                onClick={() => goToTab(id)}
                className={cn(
                  "inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-[10px] font-bold transition-all duration-200 sm:px-4 sm:text-xs",
                  selectedTab === id ? "gold-sheen text-[#17191a] shadow-[0_5px_14px_-10px_rgba(156,125,31,0.8)]" : "text-stone-500 hover:bg-stone-50 hover:text-stone-800",
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />{label}
                {id === "processos" && <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] tabular-nums", selectedTab === id ? "bg-white/55" : "bg-stone-100")}>{processCount}</span>}
                {id === "intimacoes" && <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] tabular-nums", selectedTab === id ? "bg-white/55" : "bg-stone-100")}>{publicacoes.length}</span>}
                {id === "documentos" && <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] tabular-nums", selectedTab === id ? "bg-white/55" : "bg-stone-100")}>{documentos.length}</span>}
              </button>
            ))}
          </div>
        </nav>

        <AnimatePresence mode="wait" initial={false}>
          <motion.section
            key={selectedTab}
            id={`cliente-panel-${selectedTab}`}
            role="tabpanel"
            aria-labelledby={`cliente-tab-${selectedTab}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="space-y-4"
          >
            {selectedTab === "resumo" && (
              <>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard label="Processos ativos" value={activeProcessCount} detail={`${processCount} processo${processCount === 1 ? "" : "s"} vinculado${processCount === 1 ? "" : "s"}`} icon={BriefcaseBusiness} />
                  <StatCard label="Documentos" value={documentos.length} detail="Arquivos neste prontuário" icon={FileText} />
                  <StatCard label="Em aberto" value={canReadFinanceiro ? formatCurrency(totalEmAberto) : "Restrito"} detail="Parcelas e lançamentos" icon={CircleDollarSign} />
                  <StatCard label="Próximo compromisso" value={nextEvent ? formatDate(nextEvent.inicio) : "—"} detail={nextEvent?.titulo ?? "Nenhum compromisso futuro"} icon={CalendarClock} />
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.85fr)]">
                  <SectionCard title="Dados principais" icon={UserRound} aside={<button type="button" onClick={() => goToTab("cadastro")} className="text-[10px] font-bold text-gold-dark transition hover:text-gold">Ver cadastro</button>}>
                    <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                      <Detail label={cliente.tipo === "pf" ? "Nome completo" : "Razão social"} value={cliente.nome} icon={cliente.tipo === "pf" ? UserRound : Building2} />
                      <Detail label={cliente.tipo === "pf" ? "CPF" : "CNPJ"} value={cliente.cpf_cnpj ? formatDocument(cliente.cpf_cnpj, cliente.tipo as "pf" | "pj") : null} icon={FileText} />
                      <Detail label="E-mail" value={cliente.email} icon={Mail} />
                      <Detail label="Telefone" value={cliente.telefone ? formatPhone(cliente.telefone) : null} icon={Phone} />
                      <Detail label="Endereço" value={[
                        [cliente.logradouro, cliente.numero].filter(Boolean).join(", "),
                        cliente.complemento,
                        cliente.bairro,
                        [cliente.cidade, cliente.estado].filter(Boolean).join(" / "),
                        cliente.cep ? `CEP ${cliente.cep}` : null,
                      ].filter(Boolean).join(" · ")} icon={MapPin} />
                      <Detail label="Incluído no sistema" value={formatDateTime(cliente.created_at)} icon={Clock3} />
                    </div>
                    {cliente.observacoes && <div className="mt-5 rounded-xl border border-gold/15 bg-gold-soft/30 p-3.5"><p className="text-[9px] font-black uppercase tracking-wide text-gold-dark">Observações internas</p><p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-stone-600">{cliente.observacoes}</p></div>}
                  </SectionCard>

                  <SectionCard title="Atividade recente" icon={History} aside={<button type="button" onClick={() => goToTab("historico")} className="text-[10px] font-bold text-gold-dark transition hover:text-gold">Ver histórico</button>}>
                    {activity.length === 0 ? (
                      <p className="py-6 text-center text-xs text-stone-400">As movimentações vinculadas ao cliente aparecerão aqui.</p>
                    ) : (
                      <ol className="space-y-4">
                        {activity.slice(0, 5).map((item, index) => {
                          const Icon = item.icon;
                          return <li key={item.id} className="relative flex gap-3">
                            {index < 4 && <span className="absolute bottom-[-16px] left-[15px] top-8 w-px bg-stone-100" aria-hidden="true" />}
                            <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-stone-50 text-gold-dark"><Icon className="h-3.5 w-3.5" aria-hidden="true" /></span>
                            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-x-2"><p className="text-[10px] font-bold text-stone-700">{item.title}</p><time className="text-[9px] text-stone-400">{formatDate(item.date)}</time></div><p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-stone-500">{item.description}</p><p className="mt-1 text-[9px] text-stone-400">{item.meta}</p></div>
                          </li>;
                        })}
                      </ol>
                    )}
                  </SectionCard>
                </div>
              </>
            )}

            {selectedTab === "cadastro" && (
              <SectionCard title="Dados cadastrais" icon={UserRound}>
                <ClienteForm
                  cliente={cliente}
                  processos={processos.map(({ id, numero_cnj, tipo_acao, status, papel }) => ({ id, numero_cnj, tipo_acao, status, papel }))}
                  canEdit={canEdit}
                  layout="modal"
                  onCancel={() => goToTab("resumo")}
                  onSaved={() => router.refresh()}
                />
              </SectionCard>
            )}

            {selectedTab === "processos" && (
              <SectionCard title="Processos vinculados" icon={BriefcaseBusiness} aside={<span className="rounded-full bg-gold-soft px-2.5 py-1 text-[10px] font-bold text-gold-dark">{processCount} registro{processCount === 1 ? "" : "s"}</span>}>
                {processos.length === 0 ? (
                  <EmptyState title="Nenhum processo vinculado" description="Os casos associados a este cliente serão reunidos nesta área." icon={BriefcaseBusiness} />
                ) : (
                  <div className="space-y-3">
                    {processos.map((processo) => (
                      <article key={processo.id} className="rounded-2xl border border-stone-200/80 bg-white p-4 transition hover:border-gold/30 hover:shadow-[0_10px_25px_-20px_rgba(23,25,26,0.3)] sm:p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-wide text-gold-dark">{displayLabel(processo.papel)} · {displayLabel(processo.area || processo.grupo_acao || "Processo")}</p><h3 className="mt-1 break-all font-mono text-sm font-bold text-[#17191a]">{processo.numero_cnj || processo.numero_protocolo || processo.pasta_caso || "Número do processo não informado"}</h3><p className="mt-1 text-xs text-stone-500">{processo.tipo_acao || processo.classe_processual || processo.grupo_acao || "Ação sem classificação"}</p></div>
                          <span className={cn("rounded-full border px-2.5 py-1 text-[9px] font-bold", statusTone(processo.status))}>{displayLabel(processo.status)}</span>
                        </div>
                        <div className="mt-4 grid gap-3 rounded-xl bg-stone-50/80 p-3 sm:grid-cols-2 lg:grid-cols-4">
                          <Detail label="Tribunal / Vara" value={[processo.tribunal, processo.vara].filter(Boolean).join(" · ")} />
                          <Detail label="Comarca / UF" value={[processo.comarca, processo.uf].filter(Boolean).join(" / ")} />
                          <Detail label="Distribuição" value={formatDate(processo.data_distribuicao)} />
                          <Detail label="Responsável" value={processo.advogado} />
                          <Detail label="Número do protocolo" value={processo.numero_protocolo} />
                          <Detail label="Pasta / caso" value={processo.pasta_caso} />
                          <Detail label="Processo originário" value={processo.processo_originario} />
                          <Detail label="Data do requerimento" value={formatDate(processo.data_requerimento)} />
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3">
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-stone-500"><span>Classe: {processo.classe_processual || "Não informada"}</span><span>Grupo: {processo.grupo_acao || "Não informado"}</span><span>Fase: {displayLabel(processo.fase)}</span><span>Etapa: {displayLabel(processo.etapa)}</span>{processo.valor_causa != null && <span>Valor da causa: {formatCurrency(processo.valor_causa)}</span>}</div>
                          <Link href={`/processos/${processo.id}`} className="inline-flex items-center gap-1 text-[10px] font-bold text-gold-dark transition hover:text-gold">Abrir processo <ArrowUpRight className="h-3 w-3" aria-hidden="true" /></Link>
                        </div>
                        {processo.observacoes && <p className="mt-3 whitespace-pre-wrap rounded-xl border border-gold/15 bg-gold-soft/25 p-3 text-[10px] leading-relaxed text-stone-600"><b className="text-gold-dark">Observações: </b>{processo.observacoes}</p>}
                        {processo.movimentacoes.length > 0 && <div className="mt-3 rounded-xl border border-stone-100 p-3"><p className="mb-2 text-[9px] font-black uppercase tracking-wide text-stone-400">Movimentações mais recentes</p><ul className="space-y-2">{processo.movimentacoes.slice(0, 3).map((movimentacao) => <li key={movimentacao.id} className="flex gap-2 text-[10px]"><time className="shrink-0 font-semibold text-stone-400">{formatDate(movimentacao.data_movimento)}</time><span className="text-stone-600">{movimentacao.descricao}</span></li>)}</ul></div>}
                      </article>
                    ))}
                  </div>
                )}
              </SectionCard>
            )}

            {selectedTab === "documentos" && (
              documentosError ? (
                <SectionCard title="Documentos do cliente" icon={FileText}>
                  <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">{documentosError}</div>
                </SectionCard>
              ) : <ClienteDocumentos clienteId={cliente.id} escritorioId={escritorioId} documentos={documentos} canUpload={canEdit} />
            )}

            {selectedTab === "intimacoes" && (
              <SectionCard title="Intimações e publicações" icon={Scale} aside={<span className="rounded-full bg-gold-soft px-2.5 py-1 text-[10px] font-bold text-gold-dark">{publicacoes.length}</span>}>
                {publicacoes.length === 0 ? <EmptyState title="Nenhuma publicação vinculada" description="Publicações do DJEN relacionadas aos processos deste cliente aparecerão aqui." icon={Scale} /> : <div className="space-y-3">{publicacoes.map((publicacao) => (
                  <article key={publicacao.id} className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-wide text-gold-dark">{publicacao.tribunal || "DJEN"}{publicacao.orgao ? ` · ${publicacao.orgao}` : ""}</p><h3 className="mt-1 text-xs font-black text-[#17191a]">{publicacao.tipo_comunicacao || publicacao.nome_classe || "Publicação processual"}</h3><p className="mt-1 text-[10px] text-stone-400">{processNumberById.get(publicacao.processo_id ?? "") || publicacao.numero_processo_com_mascara || publicacao.numero_processo || "Processo não identificado"} · disponibilizada em {formatDate(publicacao.data_disponibilizacao ?? publicacao.created_at)}</p></div><span className={cn("rounded-full border px-2.5 py-1 text-[9px] font-bold", publicacao.comunicacao_ativa === false ? "border-stone-200 bg-stone-100 text-stone-500" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>{publicacao.comunicacao_ativa === false ? "Inativa" : "Ativa"}</span></div>
                    {publicacao.texto && <p className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-stone-50 p-3 text-[11px] leading-relaxed text-stone-600">{publicacao.texto}</p>}
                    {publicacao.link && <a href={publicacao.link} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-gold-dark transition hover:text-gold">Acessar publicação <ArrowUpRight className="h-3 w-3" aria-hidden="true" /></a>}
                  </article>
                ))}</div>}
              </SectionCard>
            )}

            {selectedTab === "financeiro" && (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <StatCard label="Recebido" value={formatCurrency(totalRecebido)} detail="Parcelas e lançamentos pagos" icon={CheckCircle2} />
                  <StatCard label="Em aberto" value={formatCurrency(totalEmAberto)} detail="Receitas pendentes ou vencidas" icon={CircleDollarSign} />
                  <StatCard label="Contratos" value={honorarios.length} detail="Honorários vinculados" icon={Wallet} />
                </div>
                <SectionCard title="Contratos de honorários" icon={Wallet}>
                  {honorarios.length === 0 ? <EmptyState title="Nenhum contrato financeiro" description="Os honorários vinculados ao cliente serão exibidos nesta seção." icon={Wallet} /> : <div className="space-y-3">{honorarios.map((honorario) => {
                    const contratoParcelas = honorario.parcelas;
                    const valueLabel = honorario.valor_fixo != null ? formatCurrency(honorario.valor_fixo) : honorario.percentual_exito != null ? `${honorario.percentual_exito}% de êxito` : "Valor a definir";
                    return <article key={honorario.id} className="rounded-2xl border border-stone-200/80 p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-wide text-gold-dark">Honorários {displayLabel(honorario.tipo)}</p><h3 className="mt-1 text-sm font-black text-[#17191a]">{honorario.descricao || valueLabel}</h3><p className="mt-1 text-[10px] text-stone-400">Criado em {formatDate(honorario.created_at)}{honorario.processo_id ? ` · ${processNumberById.get(honorario.processo_id) ?? "Processo vinculado"}` : ""}</p></div><span className={cn("rounded-full border px-2.5 py-1 text-[9px] font-bold", statusTone(honorario.status))}>{displayLabel(honorario.status)}</span></div><div className="mt-3 flex flex-wrap gap-4 text-[10px] text-stone-500"><span>Valor fixo: <b className="text-stone-700">{honorario.valor_fixo != null ? formatCurrency(honorario.valor_fixo) : "—"}</b></span><span>Êxito: <b className="text-stone-700">{honorario.percentual_exito != null ? `${honorario.percentual_exito}%` : "—"}</b></span>{honorario.base_calculo_exito && <span>Base: <b className="text-stone-700">{honorario.base_calculo_exito}</b></span>}</div>{contratoParcelas.length > 0 && <div className="mt-4 overflow-x-auto rounded-xl border border-stone-100"><table className="w-full min-w-[520px] text-left text-[10px]"><thead className="bg-stone-50 text-stone-400"><tr><th className="px-3 py-2 font-bold">Parcela</th><th className="px-3 py-2 font-bold">Vencimento</th><th className="px-3 py-2 font-bold">Valor</th><th className="px-3 py-2 font-bold">Situação</th><th className="px-3 py-2 font-bold">Pagamento</th></tr></thead><tbody className="divide-y divide-stone-100">{contratoParcelas.map((parcela) => <tr key={parcela.id}><td className="px-3 py-2.5 font-semibold text-stone-700">{parcela.numero_parcela}</td><td className="px-3 py-2.5 text-stone-500">{formatDate(parcela.vencimento)}</td><td className="px-3 py-2.5 font-semibold text-stone-700">{formatCurrency(parcela.valor)}</td><td className="px-3 py-2.5"><span className={cn("rounded-full border px-2 py-0.5 text-[9px] font-bold", statusTone(parcela.status))}>{displayLabel(parcela.status)}</span></td><td className="px-3 py-2.5 text-stone-500">{formatDate(parcela.data_pagamento)}</td></tr>)}</tbody></table></div>}</article>;
                  })}</div>}
                </SectionCard>
                <SectionCard title="Lançamentos do cliente" icon={CircleDollarSign}>
                  {lancamentos.length === 0 ? <EmptyState title="Nenhum lançamento avulso" description="Receitas e despesas vinculadas diretamente a este cliente serão exibidas aqui." icon={CircleDollarSign} /> : <div className="divide-y divide-stone-100">{lancamentos.map((lancamento) => <div key={lancamento.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div className="min-w-0"><p className="truncate text-xs font-bold text-stone-800">{lancamento.descricao}</p><p className="mt-1 text-[10px] text-stone-400">{displayLabel(lancamento.categoria)} · vence em {formatDate(lancamento.vencimento)}</p></div><div className="flex items-center gap-2"><span className={cn("rounded-full border px-2 py-1 text-[9px] font-bold", statusTone(lancamento.status))}>{displayLabel(lancamento.status)}</span><span className={cn("text-xs font-black tabular-nums", lancamento.tipo === "receita" ? "text-emerald-700" : "text-red-600")}>{lancamento.tipo === "despesa" ? "−" : "+"}{formatCurrency(lancamento.valor)}</span></div></div>)}</div>}
                </SectionCard>
              </div>
            )}

            {selectedTab === "agenda" && (
              <SectionCard title="Compromissos e prazos" icon={CalendarDays} aside={<span className="rounded-full bg-gold-soft px-2.5 py-1 text-[10px] font-bold text-gold-dark">{eventos.length}</span>}>
                {eventos.length === 0 ? <EmptyState title="Nenhum compromisso vinculado" description="Audiências, reuniões, prazos e compromissos associados ao cliente aparecerão aqui." icon={CalendarDays} /> : <div className="divide-y divide-stone-100">{eventos.map((evento) => <article key={evento.id} className="flex gap-3 py-4 first:pt-0 last:pb-0"><span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-gold-soft text-gold-dark"><span className="text-[8px] font-black uppercase">{new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "America/Sao_Paulo" }).format(new Date(evento.inicio)).replace(".", "")}</span><span className="text-sm font-black leading-none">{new Intl.DateTimeFormat("pt-BR", { day: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(evento.inicio))}</span></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-xs font-bold text-stone-800">{evento.titulo}</h3><span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[9px] font-bold text-stone-500">{displayLabel(evento.tipo)}</span></div><p className="mt-1 text-[10px] text-stone-500">{formatDateTime(evento.inicio)}{evento.fim ? ` · até ${formatDateTime(evento.fim)}` : evento.dia_inteiro ? " · dia inteiro" : ""}</p>{evento.descricao && <p className="mt-1 text-[10px] leading-relaxed text-stone-500">{evento.descricao}</p>}<p className="mt-1 flex flex-wrap gap-x-2 text-[9px] text-stone-400">{evento.local && <span>{evento.local}</span>}{evento.processo_id && <span>Processo: {processNumberById.get(evento.processo_id) ?? "vinculado"}</span>}{evento.link_videoconf && <a href={evento.link_videoconf} target="_blank" rel="noopener noreferrer" className="font-bold text-gold-dark hover:underline">Acessar videoconferência</a>}</p></div></article>)}</div>}
              </SectionCard>
            )}

            {selectedTab === "historico" && (
              <SectionCard title="Histórico de atividades" icon={History} aside={<span className="rounded-full bg-gold-soft px-2.5 py-1 text-[10px] font-bold text-gold-dark">{activity.length}</span>}>
                {activity.length === 0 ? <EmptyState title="Ainda sem atividades registradas" description="As movimentações dos processos, compromissos e comunicações vinculados serão reunidos aqui." icon={History} /> : <ol className="space-y-0">{activity.map((item, index) => {
                  const Icon = item.icon;
                  return <li key={item.id} className="relative flex gap-3 pb-5 last:pb-0"><span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gold/20 bg-gold-soft text-gold-dark"><Icon className="h-4 w-4" aria-hidden="true" /></span>{index < activity.length - 1 && <span className="absolute bottom-0 left-[17px] top-9 w-px bg-stone-100" aria-hidden="true" />}<div className="min-w-0 flex-1 rounded-xl border border-stone-100 bg-white p-3"><div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1"><h3 className="text-xs font-bold text-stone-800">{item.title}</h3><time className="text-[9px] font-semibold text-stone-400">{formatDateTime(item.date)}</time></div><p className="mt-1.5 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-stone-600">{item.description}</p><p className="mt-1.5 text-[9px] text-stone-400">{item.meta}</p></div></li>;
                })}</ol>}
              </SectionCard>
            )}
          </motion.section>
        </AnimatePresence>
      </main>
    </div>
  );
}
