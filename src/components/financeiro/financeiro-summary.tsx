"use client";

import { startTransition, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { marcarLancamentoFinanceiroPago, marcarParcelaPaga } from "@/app/actions/financeiro";
import dynamic from "next/dynamic";
import type { DespesaParaEdicao } from "@/components/financeiro/financeiro-lancamento-dialog";
import { cn, formatCurrency } from "@/lib/utils";

type Relation<T> = T | T[] | null;
type StatusLancamento = "pendente" | "vencido" | "pago";
type TipoLancamento = "receita" | "despesa";

type ParcelaRow = {
  id: string;
  numero_parcela: number;
  valor: number;
  vencimento: string;
  status: string;
  data_pagamento: string | null;
  honorarios: Relation<{
    tipo: string;
    clientes: Relation<{ nome: string }>;
  }>;
};

type MovimentacaoRow = {
  id: string;
  tipo: string;
  descricao: string;
  categoria: string;
  valor: number;
  vencimento: string;
  status: string;
  data_pagamento: string | null;
  cliente_id: string | null;
  clientes: Relation<{ nome: string }>;
};

type HonorarioRow = {
  id: string;
  tipo: string;
  status: string;
  descricao: string | null;
  valor_fixo: number | null;
  percentual_exito: number | null;
  base_calculo_exito: string | null;
  processo_id: string | null;
  clientes: Relation<{ id: string; nome: string }>;
  processos: Relation<{ id: string; numero_cnj: string | null }>;
};

type FinanceiroItem = {
  id: string;
  sourceId: string;
  source: "parcela" | "lancamento";
  tipo: TipoLancamento;
  descricao: string;
  categoria: string;
  valor: number;
  vencimento: string;
  status: StatusLancamento;
  dataPagamento: string | null;
  cliente: string | null;
  clienteId: string | null;
};

interface FinanceiroSummaryProps {
  parcelas: ParcelaRow[];
  movimentacoes: MovimentacaoRow[];
  honorarios: HonorarioRow[];
  totalHonorarios: number;
  clientes: Array<{ id: string; nome: string }>;
  mes: string;
  hoje: string;
  canWrite: boolean;
}

const FinanceiroLancamentoDialog = dynamic(
  () => import("@/components/financeiro/financeiro-lancamento-dialog").then((m) => m.FinanceiroLancamentoDialog),
  { ssr: false },
);

function first<T>(relation: Relation<T>): T | null {
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

function getStatus(status: string, vencimento: string, hoje: string): StatusLancamento {
  if (status === "pago") return "pago";
  return vencimento < hoje ? "vencido" : "pendente";
}

function monthShift(mes: string, shift: number) {
  const year = Number(mes.slice(0, 4));
  const month = Number(mes.slice(5, 7));
  const date = new Date(Date.UTC(year, month - 1 + shift, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthTitle(mes: string) {
  const date = new Date(`${mes}-01T12:00:00Z`);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

function dateLabel(value: string) {
  return new Date(`${value.slice(0, 10)}T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

const STATUS_LABELS: Record<StatusLancamento, string> = {
  pendente: "Em aberto",
  vencido: "Vencido",
  pago: "Pago",
};

function StatusPill({ status }: { status: StatusLancamento }) {
  return <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold", status === "vencido" ? "border-rose-200 bg-rose-50 text-rose-700" : status === "pago" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800")}>{STATUS_LABELS[status]}</span>;
}

export function FinanceiroSummary({ parcelas, movimentacoes, honorarios, totalHonorarios, clientes, mes, hoje, canWrite }: FinanceiroSummaryProps) {
  const router = useRouter();
  const [abaAtiva, setAbaAtiva] = useState<"financeiro" | "honorarios">("financeiro");
  const [tipoAtivo, setTipoAtivo] = useState<TipoLancamento>("receita");
  const [statusFiltro, setStatusFiltro] = useState<"todos" | StatusLancamento>("todos");
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMontado, setDialogMontado] = useState(false);
  useEffect(() => { if (dialogOpen) setDialogMontado(true); }, [dialogOpen]);
  const [editingLancamento, setEditingLancamento] = useState<DespesaParaEdicao | null>(null);
  const [savingItem, setSavingItem] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const syncAbaFromHash = () => setAbaAtiva(window.location.hash === "#honorarios" ? "honorarios" : "financeiro");
    syncAbaFromHash();
    window.addEventListener("hashchange", syncAbaFromHash);
    return () => window.removeEventListener("hashchange", syncAbaFromHash);
  }, []);

  function selecionarAba(aba: "financeiro" | "honorarios") {
    setAbaAtiva(aba);
    setFeedback(null);
    const hash = aba === "honorarios" ? "#honorarios" : "";
    if (window.location.hash !== hash) window.location.hash = hash;
  }

  function selecionarTipo(tipo: TipoLancamento) {
    setTipoAtivo(tipo);
    setStatusFiltro("todos");
    setBusca("");
    setFeedback(null);
  }

  const itensParcelas: FinanceiroItem[] = parcelas.map((parcela) => {
    const honorario = first(parcela.honorarios);
    const tipoHonorario = honorario?.tipo;
    const categoria = tipoHonorario === "exito" ? "Honorários de êxito" : tipoHonorario === "misto" ? "Honorários mistos" : "Honorários fixos";
    return {
      id: `parcela:${parcela.id}`,
      sourceId: parcela.id,
      source: "parcela",
      tipo: "receita",
      descricao: `Parcela ${parcela.numero_parcela} de honorários`,
      categoria,
      valor: Number(parcela.valor),
      vencimento: parcela.vencimento,
      status: getStatus(parcela.status, parcela.vencimento, hoje),
      dataPagamento: parcela.data_pagamento,
      cliente: first(honorario?.clientes ?? null)?.nome ?? null,
      clienteId: null,
    };
  });

  const itensManuais: FinanceiroItem[] = movimentacoes.map((item) => ({
    id: `movimento:${item.id}`,
    sourceId: item.id,
    source: "lancamento",
    tipo: item.tipo === "despesa" ? "despesa" : "receita",
    descricao: item.descricao,
    categoria: item.categoria,
    valor: Number(item.valor),
    vencimento: item.vencimento,
    status: getStatus(item.status, item.vencimento, hoje),
    dataPagamento: item.data_pagamento,
    cliente: first(item.clientes)?.nome ?? null,
    clienteId: item.cliente_id,
  }));

  const itens = itensManuais;
  const receitas = itens.filter((item) => item.tipo === "receita");
  const despesas = itens.filter((item) => item.tipo === "despesa");
  const totalParcelasHonorarios = itensParcelas.reduce((total, item) => total + item.valor, 0);
  const parcelasHonorariosPagas = itensParcelas.filter((item) => item.status === "pago").reduce((total, item) => total + item.valor, 0);
  const parcelasHonorariosAbertas = totalParcelasHonorarios - parcelasHonorariosPagas;
  const totalReceitas = receitas.reduce((total, item) => total + item.valor, 0);
  const totalDespesas = despesas.reduce((total, item) => total + item.valor, 0);
  const resultado = totalReceitas - totalDespesas;
  const atuais = tipoAtivo === "receita" ? receitas : despesas;
  const totalAtual = atuais.reduce((total, item) => total + item.valor, 0);
  const pagoAtual = atuais.filter((item) => item.status === "pago").reduce((total, item) => total + item.valor, 0);
  const abertoAtual = atuais.filter((item) => item.status !== "pago").reduce((total, item) => total + item.valor, 0);
  const normalizedSearch = busca.trim().toLocaleLowerCase("pt-BR");
  const itensFiltrados = atuais.filter((item) => {
    if (statusFiltro !== "todos" && item.status !== statusFiltro) return false;
    if (!normalizedSearch) return true;
    return [item.descricao, item.categoria, item.cliente ?? "", item.valor, item.vencimento]
      .some((value) => String(value).toLocaleLowerCase("pt-BR").includes(normalizedSearch));
  });

  const agrupados = Array.from(atuais.reduce((groups, item) => {
    groups.set(item.categoria, (groups.get(item.categoria) ?? 0) + item.valor);
    return groups;
  }, new Map<string, number>()).entries())
    .map(([categoria, valor]) => ({ categoria, valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 6);

  async function registrarPagamento(item: FinanceiroItem) {
    setSavingItem(item.id);
    setFeedback(null);
    try {
      const result = item.source === "parcela"
        ? await marcarParcelaPaga(item.sourceId)
        : await marcarLancamentoFinanceiroPago(item.sourceId);
      if ("error" in result) {
        setFeedback(result.error);
        return;
      }
      setFeedback(item.source === "parcela" ? "Recebimento de honorários registrado." : tipoAtivo === "receita" ? "Recebimento registrado." : "Pagamento registrado.");
      startTransition(() => router.refresh());
    } catch {
      setFeedback("Não foi possível atualizar o lançamento. Tente novamente.");
    } finally {
      setSavingItem(null);
    }
  }

  function abrirEdicaoDespesa(item: FinanceiroItem) {
    setEditingLancamento({
      id: item.sourceId,
      descricao: item.descricao,
      categoria: item.categoria,
      valor: item.valor,
      vencimento: item.vencimento,
      status: item.status === "pago" ? "pago" : "pendente",
      cliente_id: item.clienteId,
    });
    setDialogOpen(true);
  }

  function alterarDialogFinanceiro(nextOpen: boolean) {
    setDialogOpen(nextOpen);
    if (!nextOpen) setEditingLancamento(null);
  }

  const tabs: Array<{ tipo: TipoLancamento; label: string; count: number }> = [
    { tipo: "receita", label: "Receitas", count: receitas.length },
    { tipo: "despesa", label: "Despesas", count: despesas.length },
  ];
  const maxFluxo = Math.max(totalReceitas, totalDespesas, 1);
  const metrics = tipoAtivo === "receita"
    ? [
      { label: "Total previsto", value: formatCurrency(totalAtual), icon: ArrowDownLeft, color: "text-[#17191a]", badge: "bg-gold-soft text-gold-dark" },
      { label: "Recebido", value: formatCurrency(pagoAtual), icon: CheckCircle2, color: "text-emerald-700", badge: "bg-emerald-50 text-emerald-700" },
      { label: "A receber", value: formatCurrency(abertoAtual), icon: Clock3, color: "text-amber-700", badge: "bg-amber-50 text-amber-700" },
    ]
    : [
      { label: "Total do mês", value: formatCurrency(totalAtual), icon: ArrowUpRight, color: "text-rose-700", badge: "bg-rose-50 text-rose-700" },
      { label: "Já pago", value: formatCurrency(pagoAtual), icon: CheckCircle2, color: "text-emerald-700", badge: "bg-emerald-50 text-emerald-700" },
      { label: "Em aberto", value: formatCurrency(abertoAtual), icon: Clock3, color: "text-amber-700", badge: "bg-amber-50 text-amber-700" },
    ];
  const abaHash = abaAtiva === "honorarios" ? "#honorarios" : "";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gold-dark">{abaAtiva === "financeiro" ? "Fluxo de caixa" : "Gestão de contratos"}</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-[#17191a] sm:text-3xl">{abaAtiva === "financeiro" ? "Receitas e despesas" : "Honorários"}</h2>
          <p className="mt-1 text-sm text-stone-500">{abaAtiva === "financeiro" ? "Acompanhe os movimentos financeiros do escritório." : "Acompanhe contratos e parcelas de honorários."}</p>
        </div>
        <nav aria-label="Selecionar mês" className="flex h-11 items-center justify-between gap-1 rounded-xl border border-stone-200/80 bg-white p-1 shadow-sm sm:min-w-[250px]">
          <Link href={`/financeiro?mes=${monthShift(mes, -1)}${abaHash}`} aria-label="Mês anterior" className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-[#17191a]"><ChevronLeft className="h-4 w-4" aria-hidden="true" /></Link>
          <span className="flex min-w-0 items-center justify-center gap-2 px-1 text-xs font-bold capitalize text-stone-700"><CalendarDays className="h-4 w-4 shrink-0 text-gold-dark" aria-hidden="true" />{monthTitle(mes)}</span>
          <Link href={`/financeiro?mes=${monthShift(mes, 1)}${abaHash}`} aria-label="Próximo mês" className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-[#17191a]"><ChevronRight className="h-4 w-4" aria-hidden="true" /></Link>
        </nav>
      </div>

      <div role="tablist" aria-label="Seções financeiras" className="inline-flex max-w-full gap-1 rounded-xl border border-stone-200/80 bg-white p-1 shadow-sm">
        {([[
          "financeiro",
          "Financeiro",
        ], ["honorarios", "Honorários"]] as const).map(([aba, label]) => {
          const active = abaAtiva === aba;
          return <motion.button key={aba} id={`tab-${aba}`} type="button" role="tab" aria-selected={active} aria-controls={aba} onClick={() => selecionarAba(aba)} whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.18 }} className={cn("relative rounded-lg px-4 py-2.5 text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-gold/50", active ? "text-gold" : "text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-800")}>{active && <motion.span layoutId="financeiro-section-indicator" transition={{ type: "spring", stiffness: 520, damping: 38 }} className="absolute inset-0 rounded-lg bg-[#17191a] shadow-sm" />}<span className="relative z-10">{label}</span></motion.button>;
        })}
      </div>

      {abaAtiva === "financeiro" ? (
      <motion.div key="painel-financeiro" id="financeiro" role="tabpanel" aria-labelledby="tab-financeiro" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-5">

      <div className="grid gap-3 lg:grid-cols-4">
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }} className="rounded-2xl border border-gold/20 bg-gradient-to-br from-white via-white to-gold-soft/50 p-5 shadow-[0_8px_24px_-20px_rgba(23,25,26,0.4)] sm:p-6 lg:col-span-2">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-stone-400">Resultado de {monthTitle(mes)}</p><p className={cn("mt-2 text-3xl font-black tracking-tight tabular-nums sm:text-4xl", resultado < 0 ? "text-rose-700" : "text-[#17191a]")}>{formatCurrency(resultado)}</p></div><span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold", resultado < 0 ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>{resultado < 0 ? <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" /> : <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />}{resultado < 0 ? "Saldo negativo" : resultado > 0 ? "Saldo positivo" : "Equilibrado"}</span></div>
          <div className="mt-5 space-y-3.5">
            <div><div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="font-semibold text-emerald-700">Receitas</span><span className="font-bold tabular-nums text-emerald-700">{formatCurrency(totalReceitas)}</span></div><div className="h-2 overflow-hidden rounded-full bg-stone-100"><motion.div initial={{ width: 0 }} animate={{ width: `${(totalReceitas / maxFluxo) * 100}%` }} transition={{ duration: 0.55 }} className="h-full rounded-full bg-emerald-500" /></div></div>
            <div><div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="font-semibold text-rose-700">Despesas</span><span className="font-bold tabular-nums text-rose-700">{formatCurrency(totalDespesas)}</span></div><div className="h-2 overflow-hidden rounded-full bg-stone-100"><motion.div initial={{ width: 0 }} animate={{ width: `${(totalDespesas / maxFluxo) * 100}%` }} transition={{ duration: 0.55, delay: 0.08 }} className="h-full rounded-full bg-rose-500" /></div></div>
          </div>
        </motion.section>

        <motion.button type="button" aria-pressed={tipoAtivo === "receita"} onClick={() => selecionarTipo("receita")} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -3, scale: 1.01 }} whileTap={{ scale: 0.985 }} transition={{ duration: 0.28, delay: 0.08 }} className={cn("group flex min-h-[150px] w-full flex-col justify-center rounded-2xl border bg-white p-5 text-left shadow-[0_8px_24px_-20px_rgba(23,25,26,0.4)] outline-none transition-colors focus-visible:ring-4 focus-visible:ring-emerald-500/15", tipoAtivo === "receita" ? "border-emerald-300 ring-2 ring-emerald-500/10" : "border-emerald-200/80 hover:border-emerald-300")}><span className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition-transform duration-200 group-hover:scale-110"><ArrowDownLeft className="h-4 w-4" aria-hidden="true" /></span><span className="text-[10px] font-black uppercase tracking-wide text-stone-400">Receitas</span><span className="mt-1 text-2xl font-black tracking-tight text-emerald-700 tabular-nums">{formatCurrency(totalReceitas)}</span><span className="mt-1 text-xs text-stone-400">{receitas.length} {receitas.length === 1 ? "lançamento" : "lançamentos"}</span></motion.button>

        <motion.button type="button" aria-pressed={tipoAtivo === "despesa"} onClick={() => selecionarTipo("despesa")} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -3, scale: 1.01 }} whileTap={{ scale: 0.985 }} transition={{ duration: 0.28, delay: 0.12 }} className={cn("group flex min-h-[150px] w-full flex-col justify-center rounded-2xl border bg-white p-5 text-left shadow-[0_8px_24px_-20px_rgba(23,25,26,0.4)] outline-none transition-colors focus-visible:ring-4 focus-visible:ring-rose-500/15", tipoAtivo === "despesa" ? "border-rose-300 ring-2 ring-rose-500/10" : "border-rose-200/80 hover:border-rose-300")}><span className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-700 transition-transform duration-200 group-hover:scale-110"><ArrowUpRight className="h-4 w-4" aria-hidden="true" /></span><span className="text-[10px] font-black uppercase tracking-wide text-rose-700">Despesas</span><span className="mt-1 text-2xl font-black tracking-tight text-rose-700 tabular-nums">{formatCurrency(totalDespesas)}</span><span className="mt-1 text-xs text-stone-400">{despesas.length} {despesas.length === 1 ? "lançamento" : "lançamentos"}</span></motion.button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Tipo de lançamento" className="inline-flex w-fit max-w-full gap-1 rounded-xl border border-stone-200/80 bg-white p-1 shadow-sm">
          {tabs.map((tab) => {
            const active = tipoAtivo === tab.tipo;
            const Icon = tab.tipo === "receita" ? ArrowDownLeft : ArrowUpRight;
            return <motion.button key={tab.tipo} type="button" aria-pressed={active} onClick={() => selecionarTipo(tab.tipo)} whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.18 }} className={cn("relative inline-flex h-10 items-center gap-2 rounded-lg px-3 text-xs font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-gold/50 sm:px-4", active ? "text-white" : "text-stone-500 hover:bg-stone-50 hover:text-stone-800")}>{active && <motion.span layoutId="financeiro-tab-indicator" transition={{ type: "spring", stiffness: 520, damping: 38 }} className={cn("absolute inset-0 rounded-lg shadow-sm", tab.tipo === "receita" ? "bg-emerald-700" : "bg-rose-600")} />}<span className="relative z-10 inline-flex items-center gap-2"><Icon className="h-4 w-4" aria-hidden="true" />{tab.label}<span className={cn("rounded-full px-1.5 py-0.5 text-[10px] tabular-nums", active ? "bg-white/15 text-white" : "bg-stone-100 text-stone-500")}>{tab.count}</span></span></motion.button>;
          })}
        </div>
        {canWrite && <button type="button" onClick={() => setDialogOpen(true)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gold px-4 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-gold-hover hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"><Plus className="h-4 w-4" aria-hidden="true" />Registrar {tipoAtivo === "receita" ? "receita" : "despesa"}</button>}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tipoAtivo} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className="grid gap-3 sm:grid-cols-3">
          {metrics.map((metric, index) => <motion.section key={metric.label} layout whileHover={{ y: -2 }} transition={{ duration: 0.18, delay: index * 0.025 }} className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_8px_24px_-20px_rgba(23,25,26,0.35)] sm:p-5"><span className={cn("mb-3 flex h-9 w-9 items-center justify-center rounded-xl", metric.badge)}><metric.icon className="h-4 w-4" aria-hidden="true" /></span><p className="text-[10px] font-black uppercase tracking-wide text-stone-400">{metric.label}</p><p className={cn("mt-1 text-xl font-black tracking-tight tabular-nums", metric.color)}>{metric.value}</p></motion.section>)}
        </motion.div>
      </AnimatePresence>

      <section className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_8px_24px_-20px_rgba(23,25,26,0.35)] sm:p-5">
        <div className="mb-4"><h3 className="text-sm font-black text-[#17191a]">Por categoria</h3><p className="mt-1 text-xs text-stone-400">Distribuição de {tipoAtivo === "receita" ? "receitas" : "despesas"} no mês selecionado.</p></div>
        <AnimatePresence mode="wait" initial={false}>
          {agrupados.length === 0 ? (
            <motion.p key={`empty-${tipoAtivo}`} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.18 }} className="rounded-xl bg-stone-50 px-4 py-6 text-center text-xs text-stone-400">As categorias aparecerão quando houver lançamentos.</motion.p>
          ) : (
            <motion.div key={`categories-${tipoAtivo}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className="grid gap-x-8 gap-y-4 md:grid-cols-2">
              {agrupados.map(({ categoria, valor }, index) => <motion.div key={categoria} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2, delay: index * 0.035 }}><div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="truncate font-semibold text-stone-600">{categoria}</span><span className={cn("shrink-0 font-bold tabular-nums", tipoAtivo === "receita" ? "text-emerald-700" : "text-rose-700")}>{formatCurrency(valor)}</span></div><div className="h-2 overflow-hidden rounded-full bg-stone-100"><motion.div initial={{ width: 0 }} animate={{ width: `${totalAtual ? (valor / totalAtual) * 100 : 0}%` }} transition={{ duration: 0.45, delay: index * 0.04 }} className={cn("h-full rounded-full", tipoAtivo === "receita" ? "bg-emerald-500" : "bg-rose-500")} /></div></motion.div>)}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <section className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_8px_24px_-20px_rgba(23,25,26,0.4)]">
        <div className="flex flex-col gap-3 border-b border-stone-100 p-3.5 sm:flex-row sm:items-center sm:p-4">
          <label className="relative block min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" /><span className="sr-only">Buscar {tipoAtivo === "receita" ? "receita" : "despesa"}, cliente ou categoria</span><input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder={`Buscar ${tipoAtivo === "receita" ? "receita" : "despesa"} ou cliente...`} className="h-10 w-full rounded-xl border border-stone-200 bg-stone-50/60 pl-9 pr-3 text-sm text-stone-700 outline-none transition placeholder:text-stone-400 focus:border-gold/70 focus:bg-white focus:ring-4 focus:ring-gold/10" /></label>
          <select aria-label="Filtrar por status" value={statusFiltro} onChange={(event) => setStatusFiltro(event.target.value as "todos" | StatusLancamento)} className="h-10 rounded-xl border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-600 outline-none transition focus:border-gold/70 focus:ring-4 focus:ring-gold/10 sm:min-w-[165px]"><option value="todos">Todos os status</option><option value="pendente">Em aberto</option><option value="vencido">Vencidos</option><option value="pago">Pagos</option></select>
        </div>

        <AnimatePresence initial={false}>{feedback && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden border-b border-stone-100 bg-gold-soft/40 px-5 py-2.5 text-xs text-gold-dark" role="status" aria-live="polite">{feedback}</motion.p>}</AnimatePresence>

        <AnimatePresence mode="wait" initial={false}>
        <motion.div key={`lancamentos-${tipoAtivo}`} initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.18 }}>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[760px] text-sm">
            <caption className="sr-only">{tipoAtivo === "receita" ? "Receitas" : "Despesas"} do mês selecionado</caption>
            <thead className="border-b border-stone-100 bg-stone-50/60"><tr><th scope="col" className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-stone-400">Descrição</th><th scope="col" className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-stone-400">Cliente</th><th scope="col" className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-stone-400">Vencimento</th><th scope="col" className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wide text-stone-400">Valor</th><th scope="col" className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-stone-400">Status</th><th scope="col" className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wide text-stone-400">Ação</th></tr></thead>
            <tbody>
              {itensFiltrados.length === 0 ? <tr><td colSpan={6} className="px-4 py-14 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-stone-100 text-stone-400">{tipoAtivo === "receita" ? <ArrowDownLeft className="h-5 w-5" aria-hidden="true" /> : <ArrowUpRight className="h-5 w-5" aria-hidden="true" />}</span><p className="mt-3 text-sm font-bold text-stone-600">{normalizedSearch || statusFiltro !== "todos" ? "Nenhum lançamento encontrado" : `Nenhuma ${tipoAtivo === "receita" ? "receita" : "despesa"} neste mês`}</p><p className="mt-1 text-xs text-stone-400">{canWrite ? "Use o botão acima para registrar a primeira movimentação." : "Os lançamentos deste período aparecerão aqui."}</p></td></tr> : itensFiltrados.map((item) => <tr key={item.id} className="border-b border-stone-50 last:border-0 transition-colors hover:bg-stone-50/70"><td className="px-4 py-3"><p className="text-xs font-bold text-stone-800">{item.descricao}</p><span className="mt-1 inline-flex rounded-full bg-stone-100 px-2 py-0.5 text-[9px] font-semibold text-stone-500">{item.categoria}</span></td><td className="px-4 py-3 text-xs text-stone-600">{item.cliente ?? <span className="text-stone-300">—</span>}</td><td className="px-4 py-3"><p className="text-xs text-stone-600">{dateLabel(item.vencimento)}</p>{item.dataPagamento && <p className="mt-0.5 text-[10px] text-emerald-600">Pago em {dateLabel(item.dataPagamento)}</p>}</td><td className={cn("px-4 py-3 text-right text-xs font-black tabular-nums", item.tipo === "despesa" ? "text-rose-700" : "text-emerald-700")}>{formatCurrency(item.valor)}</td><td className="px-4 py-3"><StatusPill status={item.status} /></td><td className="px-4 py-3 text-right"><div className="flex justify-end gap-2">{canWrite && item.tipo === "despesa" && item.source === "lancamento" && <button type="button" onClick={() => abrirEdicaoDespesa(item)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 text-[10px] font-bold text-stone-600 transition hover:border-gold/40 hover:bg-gold-soft/40 hover:text-gold-dark"><Pencil className="h-3 w-3" aria-hidden="true" />Editar</button>}{item.status !== "pago" && canWrite ? <button type="button" onClick={() => registrarPagamento(item)} disabled={savingItem !== null} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[10px] font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-60">{savingItem === item.id ? <LoaderCircle className="h-3 w-3 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-3 w-3" aria-hidden="true" />}{savingItem === item.id ? "Salvando" : tipoAtivo === "receita" ? "Registrar recebimento" : "Marcar como pago"}</button> : !canWrite || item.tipo === "receita" ? <span className="text-[10px] text-stone-300">—</span> : null}</div></td></tr>)}
            </tbody>
          </table>
        </div>

        <div className="space-y-2.5 p-3 md:hidden">
          {itensFiltrados.length === 0 ? <div className="px-3 py-9 text-center"><p className="text-sm font-bold text-stone-600">{normalizedSearch || statusFiltro !== "todos" ? "Nenhum lançamento encontrado" : `Nenhuma ${tipoAtivo === "receita" ? "receita" : "despesa"} neste mês`}</p><p className="mt-1 text-xs text-stone-400">{canWrite ? "Registre uma movimentação pelo botão acima." : "Os lançamentos deste período aparecerão aqui."}</p></div> : itensFiltrados.map((item) => <article key={item.id} className="rounded-xl border border-stone-100 bg-stone-50/45 p-3.5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-black text-[#17191a]">{item.descricao}</p><p className="mt-1 text-[10px] text-stone-400">{item.categoria}{item.cliente ? ` · ${item.cliente}` : ""}</p></div><StatusPill status={item.status} /></div><div className="mt-3 flex items-end justify-between gap-2 border-t border-stone-200/70 pt-3"><p className="text-[10px] text-stone-400">Vencimento {dateLabel(item.vencimento)}</p><p className={cn("text-sm font-black tabular-nums", item.tipo === "despesa" ? "text-rose-700" : "text-emerald-700")}>{formatCurrency(item.valor)}</p></div>{item.dataPagamento && <p className="mt-1 text-[10px] text-emerald-600">Pago em {dateLabel(item.dataPagamento)}</p>}<div className="mt-3 flex gap-2">{canWrite && item.tipo === "despesa" && item.source === "lancamento" && <button type="button" onClick={() => abrirEdicaoDespesa(item)} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 text-[10px] font-bold text-stone-600 transition hover:border-gold/40 hover:bg-gold-soft/40 hover:text-gold-dark"><Pencil className="h-3 w-3" aria-hidden="true" />Editar despesa</button>}{item.status !== "pago" && canWrite && <button type="button" onClick={() => registrarPagamento(item)} disabled={savingItem !== null} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[10px] font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-60">{savingItem === item.id ? <LoaderCircle className="h-3 w-3 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-3 w-3" aria-hidden="true" />}{savingItem === item.id ? "Salvando" : tipoAtivo === "receita" ? "Registrar recebimento" : "Marcar como pago"}</button>}</div></article>)}
        </div>
        </motion.div>
        </AnimatePresence>
      </section>

      {dialogMontado && <FinanceiroLancamentoDialog key={`${tipoAtivo}-${editingLancamento?.id ?? "novo"}`} open={dialogOpen} onOpenChange={alterarDialogFinanceiro} tipo={tipoAtivo} clientes={clientes} hoje={hoje} lancamento={editingLancamento ?? undefined} />}
      </motion.div>
      ) : (
      <motion.div key="painel-honorarios" id="honorarios" role="tabpanel" aria-labelledby="tab-honorarios" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <motion.section whileHover={{ y: -2 }} className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-[0_8px_24px_-20px_rgba(23,25,26,0.35)]"><p className="text-[10px] font-black uppercase tracking-wide text-stone-400">Contratos ativos</p><p className="mt-2 text-2xl font-black tabular-nums text-[#17191a]">{totalHonorarios}</p></motion.section>
          <motion.section whileHover={{ y: -2 }} className="rounded-2xl border border-emerald-200/80 bg-white p-5 shadow-[0_8px_24px_-20px_rgba(23,25,26,0.35)]"><p className="text-[10px] font-black uppercase tracking-wide text-stone-400">Previsto no mês</p><p className="mt-2 text-2xl font-black tabular-nums text-emerald-700">{formatCurrency(totalParcelasHonorarios)}</p></motion.section>
          <motion.section whileHover={{ y: -2 }} className="rounded-2xl border border-amber-200/80 bg-white p-5 shadow-[0_8px_24px_-20px_rgba(23,25,26,0.35)]"><p className="text-[10px] font-black uppercase tracking-wide text-stone-400">Em aberto</p><p className="mt-2 text-2xl font-black tabular-nums text-amber-700">{formatCurrency(parcelasHonorariosAbertas)}</p></motion.section>
        </div>
        <AnimatePresence initial={false}>{feedback && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700" role="status" aria-live="polite">{feedback}</motion.p>}</AnimatePresence>

        <section className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_8px_24px_-20px_rgba(23,25,26,0.4)]">
          <div className="flex items-center gap-3 border-b border-stone-100 px-4 py-4 sm:px-5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-soft text-gold-dark"><CalendarDays className="h-4 w-4" aria-hidden="true" /></span><div><h2 className="text-sm font-black text-[#17191a]">Parcelas de honorários</h2><p className="mt-0.5 text-[11px] text-stone-400">Cobranças previstas para {monthTitle(mes)}</p></div></div>
          {itensParcelas.length === 0 ? <div className="px-5 py-10 text-center"><p className="text-sm font-bold text-stone-600">Nenhuma parcela neste mês</p><p className="mt-1 text-xs text-stone-400">As cobranças dos contratos de honorários aparecerão aqui.</p></div> : <div className="grid gap-2.5 p-3 sm:grid-cols-2 xl:grid-cols-3">{itensParcelas.map((item, index) => <motion.article key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: Math.min(index * 0.035, 0.2) }} className="rounded-xl border border-stone-100 bg-stone-50/45 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-black text-[#17191a]">{item.cliente ?? "Cliente"}</p><p className="mt-1 truncate text-[10px] text-stone-400">{item.descricao}</p></div><StatusPill status={item.status} /></div><div className="mt-3 flex items-end justify-between gap-2 border-t border-stone-200/70 pt-3"><p className="text-[10px] text-stone-400">Vencimento {dateLabel(item.vencimento)}</p><p className="text-sm font-black tabular-nums text-emerald-700">{formatCurrency(item.valor)}</p></div>{item.dataPagamento && <p className="mt-1 text-[10px] text-emerald-600">Recebido em {dateLabel(item.dataPagamento)}</p>}{item.status !== "pago" && canWrite && <button type="button" onClick={() => registrarPagamento(item)} disabled={savingItem !== null} className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[10px] font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-60">{savingItem === item.id ? <LoaderCircle className="h-3 w-3 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-3 w-3" aria-hidden="true" />}{savingItem === item.id ? "Salvando" : "Registrar recebimento"}</button>}</motion.article>)}</div>}
        </section>

      <section id="contratos-honorarios" className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_8px_24px_-20px_rgba(23,25,26,0.4)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#17191a] text-gold"><FileText className="h-4 w-4" aria-hidden="true" /></span><div><h2 className="text-sm font-black text-[#17191a]">Contratos de honorários</h2><p className="mt-0.5 text-[11px] text-stone-400">Vínculo com clientes, processos e critérios de cobrança</p></div></div>
          {canWrite && <Link href="/financeiro/novo" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gold px-3 text-xs font-bold text-white transition hover:bg-gold-hover">Novo honorário <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>}
        </div>
        {honorarios.length === 0 ? <div className="px-5 py-10 text-center"><p className="text-sm font-bold text-stone-600">Nenhum contrato ativo</p><p className="mt-1 text-xs text-stone-400">Cadastre honorários para acompanhar cobranças e parcelas neste painel.</p></div> : <div className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">{honorarios.map((honorario, index) => {
          const cliente = first(honorario.clientes);
          const processo = first(honorario.processos);
          return <motion.article key={honorario.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: Math.min(index * 0.035, 0.21) }} className="rounded-xl border border-stone-100 bg-stone-50/45 p-4 transition hover:border-gold/35 hover:bg-white"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-black text-[#17191a]">{cliente?.nome ?? "Cliente"}</p><p className="mt-1 truncate text-[10px] text-stone-400">{honorario.descricao || processo?.numero_cnj || "Contrato de honorários"}</p></div><span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9px] font-bold capitalize text-emerald-700">Ativo</span></div><div className="mt-3 flex flex-wrap gap-1.5">{(honorario.tipo === "fixo" || honorario.tipo === "misto") && honorario.valor_fixo != null && <span className="rounded-lg bg-white px-2 py-1 text-[10px] font-bold text-stone-700">Fixo {formatCurrency(Number(honorario.valor_fixo))}</span>}{(honorario.tipo === "exito" || honorario.tipo === "misto") && honorario.percentual_exito != null && <span className="rounded-lg bg-gold-soft px-2 py-1 text-[10px] font-bold text-gold-dark">Êxito {honorario.percentual_exito}%</span>}</div>{honorario.base_calculo_exito && <p className="mt-2 line-clamp-2 text-[10px] leading-relaxed text-stone-400">Base: {honorario.base_calculo_exito}</p>}{processo && <Link href={`/processos/${processo.id}`} className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-gold-dark hover:text-[#17191a]">Ver processo <ArrowRight className="h-3 w-3" aria-hidden="true" /></Link>}</motion.article>;
        })}</div>}
      </section>

      </motion.div>
      )}
    </motion.div>
  );
}
