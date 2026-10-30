"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion, useReducedMotion, useReducedMotionConfig } from "framer-motion";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  FileText,
  LayoutGrid,
  List,
  Plus,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { Combobox } from "@base-ui/react/combobox";
import { StatusFilterSelect, type StatusFilterOption } from "@/components/ui/status-filter-select";
import { useDebounce } from "@/hooks/use-debounce";
import { cn, formatCurrency } from "@/lib/utils";
import {
  deriveProcessClientOptions,
  filterProcessClientOptions,
  filterProcessList,
} from "@/lib/processos/processos-list-filters.mjs";

const PAGE_SIZE = 50;

interface ProcessClientOption {
  id: string;
  name: string;
  count: number;
}

export interface ProcessoListItem {
  id: string;
  numero_cnj: string | null;
  numero_protocolo: string | null;
  processo_originario: string | null;
  pasta_caso: string | null;
  data_requerimento: string | null;
  grupo_acao: string | null;
  tipo_acao: string | null;
  classe_processual: string | null;
  etapa: string | null;
  status: string;
  fase: string | null;
  tribunal: string | null;
  vara: string | null;
  ultima_sync_cnj: string | null;
  valor_causa: number | null;
  observacoes: string | null;
  areas_direito: { nome: string } | null;
  usuarios: { nome: string } | null;
  clientes: Array<{ id: string; nome: string; papel: string | null }>;
  ultima_movimentacao: {
    data_hora: string | null;
    data_movimento: string;
    descricao: string;
  } | null;
  honorarios: {
    valor_fixo: number | null;
    percentual_exito: number | null;
    contingenciamento: string | null;
  } | null;
}

const STATUS_TABS: StatusFilterOption[] = [
  { value: "ativo", label: "Ativos", colorDot: "bg-emerald-500" },
  { value: "todos", label: "Todos", colorDot: "bg-[#17191a] dark:bg-zinc-100" },
  { value: "suspenso", label: "Suspensos", colorDot: "bg-amber-500" },
  { value: "arquivado", label: "Arquivados", colorDot: "bg-stone-400" },
  { value: "encerrado", label: "Encerrados", colorDot: "bg-sky-500" },
];

const STATUS_BADGE: Record<string, string> = {
  ativo: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300",
  suspenso: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300",
  arquivado: "border-stone-200 bg-stone-100 text-stone-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
  encerrado: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-300",
};

const STATUS_LABEL: Record<string, string> = {
  ativo: "Ativo",
  suspenso: "Suspenso",
  arquivado: "Arquivado",
  encerrado: "Encerrado",
};

const PHASE_LABEL: Record<string, string> = {
  negociacao: "Negociação",
  extrajudicial: "Extrajudicial",
  conhecimento: "Conhecimento",
  recursal: "Recursal",
  execucao: "Execução",
  cumprimento_sentenca: "Cumprimento de sentença",
  liquidacao: "Liquidação",
  arquivado: "Arquivado",
};

function displayDate(value: string | null) {
  if (!value) return null;
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR");
}

function movementDateLabel(movement: ProcessoListItem["ultima_movimentacao"]): string {
  if (!movement) return "Data indisponível";

  const dateTime = movement.data_hora ? new Date(movement.data_hora) : null;
  if (dateTime && !Number.isNaN(dateTime.getTime())) {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo",
    }).format(dateTime);
  }

  const date = new Date(`${movement.data_movimento.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function labelize(value: string | null) {
  if (!value) return null;
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-stone-400 dark:text-zinc-400">{label}</p>
      <p className="mt-0.5 truncate text-xs font-semibold text-stone-700 dark:text-zinc-200">{value}</p>
    </div>
  );
}

interface ProcessosListProps {
  processos: ProcessoListItem[];
  currentSearch: string;
  currentStatus: string;
}

interface ProcessHoverPreviewPosition {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
  placement: "right" | "left" | "overlay";
}

export function ProcessosList({ processos, currentSearch, currentStatus }: ProcessosListProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(currentSearch);
  const [selectedStatus, setSelectedStatus] = useState(currentStatus || "ativo");
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);
  const [activePreview, setActivePreview] = useState<{ id: string; anchor: HTMLElement } | null>(null);
  const [previewPosition, setPreviewPosition] = useState<ProcessHoverPreviewPosition | null>(null);
  const previewPanelRef = useRef<HTMLDivElement | null>(null);
  const previewCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotionConfig = useReducedMotionConfig();
  const prefersReducedMotion = useReducedMotion();
  const shouldReduceMotion = reducedMotionConfig === true || prefersReducedMotion === true;
  const debouncedSearch = useDebounce(search, 180);

  function clearPreviewCloseTimer() {
    if (previewCloseTimerRef.current !== null) {
      clearTimeout(previewCloseTimerRef.current);
      previewCloseTimerRef.current = null;
    }
  }

  function openPreview(id: string, anchor: HTMLElement) {
    clearPreviewCloseTimer();
    setPreviewPosition(null);
    setActivePreview({ id, anchor });
  }

  function schedulePreviewClose(id: string) {
    clearPreviewCloseTimer();
    previewCloseTimerRef.current = setTimeout(() => {
      setActivePreview((current) => current?.id === id ? null : current);
      previewCloseTimerRef.current = null;
    }, 140);
  }

  useEffect(() => () => clearPreviewCloseTimer(), []);

  useLayoutEffect(() => {
    if (!activePreview) {
      setPreviewPosition(null);
      return;
    }

    const anchor = activePreview.anchor;
    const panel = previewPanelRef.current;
    if (!panel) return;

    const updatePosition = () => {
      if (!anchor.isConnected) {
        setActivePreview((current) => current?.anchor === anchor ? null : current);
        return;
      }

      const bounds = anchor.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
      const viewportHeight = window.innerHeight;
      if (bounds.bottom < 0 || bounds.top > viewportHeight || viewportWidth <= 24 || viewportHeight <= 24) {
        setActivePreview((current) => current?.anchor === anchor ? null : current);
        return;
      }

      const margin = 12;
      const gap = 10;
      const preferredWidth = Math.min(416, viewportWidth - margin * 2);
      const rightSpace = viewportWidth - bounds.right - gap - margin;
      const leftSpace = bounds.left - gap - margin;
      const minimumSideWidth = Math.min(280, preferredWidth);
      let placement: ProcessHoverPreviewPosition["placement"] = "overlay";
      let width = preferredWidth;

      if (rightSpace >= minimumSideWidth) {
        placement = "right";
        width = Math.min(preferredWidth, rightSpace);
      } else if (leftSpace >= minimumSideWidth) {
        placement = "left";
        width = Math.min(preferredWidth, leftSpace);
      }

      const maxHeight = viewportHeight - margin * 2;
      panel.style.width = `${width}px`;
      panel.style.maxHeight = `${maxHeight}px`;
      const panelHeight = panel.getBoundingClientRect().height;
      const preferredLeft = placement === "right"
        ? bounds.right + gap
        : placement === "left"
          ? bounds.left - gap - width
          : margin;
      const left = Math.max(margin, Math.min(preferredLeft, viewportWidth - margin - width));
      const top = Math.max(margin, Math.min(bounds.top, viewportHeight - margin - panelHeight));

      setPreviewPosition({ left, top, width, maxHeight, placement });
    };

    updatePosition();
    let frame: number | null = null;
    const scheduleUpdate = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updatePosition);
    };
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("scroll", scheduleUpdate, true);

    return () => {
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("scroll", scheduleUpdate, true);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [activePreview, view]);

  useEffect(() => setSearch(currentSearch), [currentSearch]);
  useEffect(() => setSelectedStatus(currentStatus || "ativo"), [currentStatus]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) params.set("search", debouncedSearch);
    else params.delete("search");
    const next = params.toString();
    const current = searchParams.toString();
    if (next !== current) {
      window.history.replaceState(null, "", next ? `${pathname}?${next}` : pathname);
    }
  }, [debouncedSearch, pathname, searchParams]);

  const clientOptions = useMemo<ProcessClientOption[]>(() => deriveProcessClientOptions(processos), [processos]);
  const matchingClientOptions = useMemo(
    () => filterProcessClientOptions(clientOptions, clientSearch),
    [clientOptions, clientSearch]
  );
  const selectedClientOption = useMemo(
    () => clientOptions.find((client) => client.id === selectedClient) ?? null,
    [clientOptions, selectedClient]
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { todos: processos.length };
    for (const process of processos) counts[process.status] = (counts[process.status] ?? 0) + 1;
    return counts;
  }, [processos]);

  const filteredProcesses = useMemo(
    () => filterProcessList(processos, {
      clientId: selectedClient,
      search: debouncedSearch,
      status: selectedStatus,
    }),
    [debouncedSearch, processos, selectedClient, selectedStatus]
  );

  const visibleProcesses = useMemo(() => filteredProcesses.slice(0, visibleLimit), [filteredProcesses, visibleLimit]);
  const hiddenCount = filteredProcesses.length - visibleProcesses.length;

  useEffect(() => {
    if (activePreview && !visibleProcesses.some((process) => process.id === activePreview.id)) {
      clearPreviewCloseTimer();
      setActivePreview(null);
    }
  }, [activePreview, visibleProcesses]);

  useEffect(() => {
    setVisibleLimit(PAGE_SIZE);
  }, [filteredProcesses]);

    const statusOptions = useMemo<StatusFilterOption[]>(
    () =>
      STATUS_TABS.map((tab) => ({
        ...tab,
        count: statusCounts[tab.value] ?? 0,
      })),
    [statusCounts]
  );

  function changeStatus(value: string) {
    setSelectedStatus(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value === "ativo") {
      params.delete("status");
    } else {
      params.set("status", value);
    }
    const next = params.toString();
    window.history.replaceState(null, "", next ? `${pathname}?${next}` : pathname);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Processos cadastrados", value: processos.length, accent: "bg-[#17191a] dark:bg-zinc-100" },
          { label: "Em andamento", value: statusCounts.ativo ?? 0, accent: "bg-emerald-500" },
          { label: "Clientes com processos", value: clientOptions.length, accent: "bg-gold" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-3 rounded-2xl border border-stone-200/80 bg-white px-4 py-3.5 shadow-[0_8px_24px_-20px_rgba(23,25,26,0.4)] dark:border-zinc-800 dark:bg-zinc-900"
          >
            <span className={cn("h-8 w-1 rounded-full", stat.accent)} aria-hidden="true" />
            <div>
              <p className="text-xl font-black leading-none tracking-tight text-[#17191a] dark:text-zinc-100">{stat.value}</p>
              <p className="mt-1 text-[11px] font-medium text-stone-500 dark:text-zinc-400">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-stone-200/80 bg-white p-3 shadow-[0_8px_24px_-20px_rgba(23,25,26,0.4)] dark:border-zinc-800 dark:bg-zinc-900 sm:p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:items-center">
          <label className="relative block min-w-0 flex-1 sm:max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-zinc-500" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar cliente, CNJ, protocolo ou pasta..."
              className="w-full rounded-xl border border-stone-200 bg-stone-50/60 py-2.5 pl-10 pr-3 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-gold/70 focus:bg-white focus:ring-4 focus:ring-gold/10 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:bg-zinc-900"
              aria-label="Buscar processos por cliente ou dados do processo"
            />
          </label>

          <Combobox.Root<ProcessClientOption>
            items={clientOptions}
            filteredItems={matchingClientOptions}
            value={selectedClientOption}
            onValueChange={(client) => {
              setSelectedClient(client?.id ?? null);
              setClientSearch(client?.name ?? "");
            }}
            inputValue={clientSearch}
            onInputValueChange={(value, eventDetails) => {
              setClientSearch(value);
              if (["input-change", "input-clear", "clear-press"].includes(eventDetails.reason)) {
                setSelectedClient(null);
              }
            }}
            itemToStringLabel={(client) => client.name}
            itemToStringValue={(client) => client.id}
            disabled={clientOptions.length === 0}
            autoHighlight
          >
            <div className="relative min-w-0 md:w-56">
              <Combobox.Input
                aria-label="Filtrar processos por cliente"
                placeholder={clientOptions.length ? "Todos os clientes" : "Nenhum cliente vinculado"}
                className="h-10 w-full min-w-0 rounded-xl border border-stone-200 bg-stone-50/60 py-2 pl-3 pr-16 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-gold/70 focus:bg-white focus:ring-4 focus:ring-gold/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:bg-zinc-900"
              />
              {selectedClientOption && (
                <Combobox.Clear
                  aria-label="Limpar filtro de cliente"
                  className="absolute right-9 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </Combobox.Clear>
              )}
              <Combobox.Trigger
                aria-label="Mostrar clientes"
                className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </Combobox.Trigger>
            </div>
            <Combobox.Portal>
              <Combobox.Positioner sideOffset={6} align="start" className="z-50 w-[var(--anchor-width)]">
                <Combobox.Popup className="max-h-72 overflow-hidden rounded-xl border border-stone-200 bg-white p-1 shadow-xl shadow-stone-900/10 outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/40">
                  <Combobox.List className="max-h-64 overflow-y-auto">
                    {matchingClientOptions.map((client) => (
                      <Combobox.Item
                        key={client.id}
                        value={client}
                        className="flex w-full cursor-default items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-stone-700 outline-none transition data-[highlighted]:bg-gold-soft data-[highlighted]:text-[#17191a] data-[selected]:font-semibold dark:text-zinc-200 dark:data-[highlighted]:bg-[#D4AF37]/15 dark:data-[highlighted]:text-[#E5C158]"
                      >
                        <UserRound className="h-3.5 w-3.5 shrink-0 text-stone-400 dark:text-zinc-500" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate">{client.name}</span>
                        <span className="text-[10px] text-stone-400 dark:text-zinc-500">{client.count}</span>
                        <Combobox.ItemIndicator>
                          <Check className="h-3.5 w-3.5 text-gold-dark dark:text-[#E5C158]" aria-hidden="true" />
                        </Combobox.ItemIndicator>
                      </Combobox.Item>
                    ))}
                  </Combobox.List>
                  <Combobox.Empty className="px-3 py-3 text-center text-xs text-stone-500 dark:text-zinc-400">
                    Nenhum cliente encontrado.
                  </Combobox.Empty>
                </Combobox.Popup>
              </Combobox.Positioner>
            </Combobox.Portal>
          </Combobox.Root>
        </div>

        <div className="flex min-w-0 items-center justify-between gap-3 lg:justify-end">
          <StatusFilterSelect
            value={selectedStatus}
            onChange={changeStatus}
            options={statusOptions}
            ariaLabel="Filtrar processos por status"
          />
          <div className="hidden shrink-0 rounded-xl border border-stone-200 p-1 dark:border-zinc-800 sm:flex" aria-label="Formato da visualização">
            <button
              type="button"
              onClick={() => setView("grid")}
              aria-label="Visualização em cartões"
              aria-pressed={view === "grid"}
              className={cn("rounded-lg p-1.5 transition", view === "grid" ? "bg-[#17191a] text-gold dark:bg-zinc-800 dark:text-[#E5C158]" : "text-stone-400 hover:text-stone-700 dark:text-zinc-400 dark:hover:text-zinc-200")}
            >
              <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              aria-label="Visualização em lista"
              aria-pressed={view === "list"}
              className={cn("rounded-lg p-1.5 transition", view === "list" ? "bg-[#17191a] text-gold dark:bg-zinc-800 dark:text-[#E5C158]" : "text-stone-400 hover:text-stone-700 dark:text-zinc-400 dark:hover:text-zinc-200")}
            >
              <List className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {processos.length > 0 && (
        <div className="flex justify-end">
          <Link
            href="/processos/novo"
            aria-label="Criar novo processo"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gold px-5 text-sm font-bold text-white shadow-[0_10px_24px_-14px_rgba(23,25,26,0.65)] transition duration-200 hover:-translate-y-0.5 hover:bg-gold-hover hover:shadow-[0_14px_28px_-14px_rgba(23,25,26,0.55)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/25 sm:w-auto"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Novo Processo
          </Link>
        </div>
      )}

      <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between px-1">
            <p className="text-xs font-semibold text-stone-500 dark:text-zinc-400">
              {selectedClientOption?.name ?? "Todos os processos"}
              <span className="ml-1.5 font-normal text-stone-400 dark:text-zinc-500">· {filteredProcesses.length} resultado{filteredProcesses.length === 1 ? "" : "s"}</span>
            </p>
            <p className="hidden text-[10px] text-stone-400 dark:text-zinc-500 sm:block">Com mouse, passe sobre um cartão para ver os detalhes</p>
          </div>

          {filteredProcesses.length === 0 ? processos.length === 0 ? (
            <motion.section
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              aria-labelledby="processos-empty-title"
              className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-8 text-center dark:border-zinc-800 dark:bg-zinc-900 sm:px-10 sm:py-10"
            >
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-soft text-gold-dark dark:bg-[#D4AF37]/15 dark:text-[#E5C158]">
                <BriefcaseBusiness className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 id="processos-empty-title" className="mt-3 text-base font-bold text-stone-800 dark:text-zinc-100">
                Comece cadastrando um processo
              </h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-stone-600 dark:text-zinc-400">
                O número CNJ é atribuído pelo tribunal após a distribuição; o DataJud apenas consulta dados disponíveis, não cria o número.
                Você pode encontrá-lo na capa do processo, na consulta processual ou no comprovante de distribuição do tribunal.
              </p>
              <p className="mx-auto mt-2 max-w-2xl text-xs leading-5 text-stone-500 dark:text-zinc-400">
                Se o caso ainda não foi distribuído, cadastre-o sem o CNJ e informe o número depois. A consulta ao DataJud depende de configuração no servidor do sistema.
              </p>
              <Link
                href="/processos/novo"
                className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_-14px_rgba(23,25,26,0.65)] transition hover:bg-gold-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/25"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Cadastrar primeiro processo
              </Link>
            </motion.section>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white/70 px-6 text-center dark:border-zinc-800 dark:bg-zinc-900/70"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-soft text-gold-dark dark:bg-[#D4AF37]/15 dark:text-[#E5C158]">
                <BriefcaseBusiness className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="mt-3 text-sm font-bold text-stone-700 dark:text-zinc-100">Nenhum processo corresponde aos filtros</p>
              <p className="mt-1 max-w-sm text-xs text-stone-400 dark:text-zinc-400">Ajuste a busca ou os filtros para encontrar outros processos.</p>
            </motion.div>
          ) : (
            <div
              className={cn("grid gap-3", view === "grid" ? "sm:grid-cols-2 2xl:grid-cols-3" : "grid-cols-1")}
            >
                {visibleProcesses.map((process) => {
                  const clientNames = process.clientes.map((client) => client.nome);
                  const primaryClient = clientNames[0] ?? "Cliente não vinculado";
                  const syncDate = process.ultima_sync_cnj ? new Date(process.ultima_sync_cnj) : null;
                  const isHovered = activePreview?.id === process.id;

                  return (
                    <article
                      key={process.id}
                      onPointerEnter={(event) => {
                        if (event.pointerType === "touch" || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
                        openPreview(process.id, event.currentTarget);
                      }}
                      onPointerLeave={() => schedulePreviewClose(process.id)}
                      onFocusCapture={(event) => openPreview(process.id, event.currentTarget)}
                      onBlurCapture={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) schedulePreviewClose(process.id);
                      }}
                      className={cn(
                        "group relative min-w-0 overflow-visible rounded-2xl border bg-white shadow-[0_8px_28px_-22px_rgba(23,25,26,0.45)] dark:bg-zinc-900",
                        shouldReduceMotion
                          ? "transform-none transition-none"
                          : "transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:shadow-[0_18px_35px_-24px_rgba(23,25,26,0.42)]",
                        isHovered ? "z-20 border-gold/50" : "border-stone-200/80 dark:border-zinc-800",
                        view === "list" && "sm:flex sm:items-stretch"
                      )}
                                          >
                      <Link href={`/processos/${process.id}`} className="block h-full min-w-0 flex-1 p-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#17191a] text-gold shadow-sm dark:bg-zinc-800 dark:text-[#E5C158]">
                              <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <div className="min-w-0 pt-0.5">
                              <p className="truncate text-sm font-black text-[#17191a] dark:text-zinc-100" title={clientNames.join(", ")}>
                                {primaryClient}{clientNames.length > 1 ? ` +${clientNames.length - 1}` : ""}
                              </p>
                              <p className="mt-1 truncate text-[11px] text-stone-500 dark:text-zinc-400">
                                {process.pasta_caso || process.tipo_acao || "Processo em preparação"}
                              </p>
                            </div>
                          </div>
                          <span className={cn("shrink-0 rounded-full border px-2 py-1 text-[9px] font-bold", STATUS_BADGE[process.status] ?? "border-stone-200 bg-stone-50 text-stone-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400")}>
                            {STATUS_LABEL[process.status] ?? labelize(process.status)}
                          </span>
                        </div>

                        <div className="mt-4 rounded-xl bg-stone-50/80 px-3 py-2.5 dark:bg-zinc-800/60">
                          <p className="truncate font-mono text-xs font-semibold text-stone-700 dark:text-zinc-200">
                            {process.numero_cnj ?? process.numero_protocolo ?? process.processo_originario ?? "Número ainda não informado"}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-stone-400 dark:text-zinc-400">
                            <span>{process.tipo_acao ?? "Tipo não definido"}</span>
                            {(process.areas_direito?.nome || process.fase) && <span aria-hidden="true">·</span>}
                            <span>{process.areas_direito?.nome ?? PHASE_LABEL[process.fase ?? ""] ?? process.fase ?? ""}</span>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-1.5 text-[10px] text-stone-500 dark:text-zinc-400">
                            <UserRound className="h-3 w-3 shrink-0 text-stone-400 dark:text-zinc-500" aria-hidden="true" />
                            <span className="truncate">{process.usuarios?.nome ?? "Sem responsável"}</span>
                          </div>
                          <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-bold text-gold-dark transition group-hover:gap-1.5 dark:text-[#E5C158]">
                            Abrir <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                          </span>
                        </div>
                        <span className="sr-only">
                          {process.ultima_movimentacao
                            ? `Última movimentação em ${movementDateLabel(process.ultima_movimentacao)}: ${process.ultima_movimentacao.descricao}`
                            : "Ainda não há movimentações registradas para este processo."}
                        </span>
                      </Link>

                      {isHovered && typeof document !== "undefined" && createPortal(
                          <motion.div
                            ref={previewPanelRef}
                            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.985 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: shouldReduceMotion ? 0 : 0.16 }}
                            aria-hidden="true"
                            data-placement={previewPosition?.placement ?? "overlay"}
                            onPointerEnter={clearPreviewCloseTimer}
                            onPointerLeave={() => schedulePreviewClose(process.id)}
                            className={cn(
                              "fixed z-[80] flex flex-col justify-between overflow-y-auto overscroll-contain rounded-[1.25rem_0.45rem_1.25rem_0.45rem] border border-gold/45 border-l-4 border-l-gold/60 bg-[linear-gradient(135deg,#fffdf6_0%,#fffaf0_52%,#fffdf8_100%)] p-4 shadow-[0_20px_48px_-24px_rgba(23,25,26,0.5)] before:pointer-events-none before:absolute before:top-7 before:z-0 before:h-3 before:w-3 before:rotate-45 before:border before:border-gold/45 before:bg-[#fffdf6] before:content-[''] dark:bg-none dark:bg-zinc-900 dark:before:bg-zinc-900",
                              previewPosition?.placement === "right" && "before:-left-1.5 before:border-r-0 before:border-t-0",
                              previewPosition?.placement === "left" && "before:-right-1.5 before:border-b-0 before:border-l-0",
                              !previewPosition && "invisible w-[min(26rem,calc(100vw-1.5rem))]"
                            )}
                            style={{
                              left: previewPosition?.left ?? 12,
                              top: previewPosition?.top ?? 12,
                              width: previewPosition?.width,
                              maxHeight: previewPosition?.maxHeight ?? "calc(100vh - 1.5rem)",
                              visibility: previewPosition ? "visible" : "hidden",
                            }}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-gold-dark dark:text-[#E5C158]">Detalhes do processo</p>
                                  <p className="mt-1 truncate text-sm font-black text-[#17191a] dark:text-zinc-100">{clientNames.join(", ") || "Cliente não vinculado"}</p>
                                </div>
                                <span className="rounded-full bg-[#17191a] px-2 py-1 text-[9px] font-bold text-gold dark:bg-zinc-800 dark:text-[#E5C158]">{labelize(process.grupo_acao) ?? "Caso"}</span>
                              </div>
                              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
                                <Detail label="Tipo de ação" value={process.tipo_acao} />
                                <Detail label="Fase" value={PHASE_LABEL[process.fase ?? ""] ?? labelize(process.fase)} />
                                <Detail label="Etapa" value={labelize(process.etapa)} />
                                <Detail label="Área" value={process.areas_direito?.nome} />
                                <Detail label="Protocolo" value={process.numero_protocolo} />
                                <Detail label="Pasta / caso" value={process.pasta_caso} />
                                <Detail label="Tribunal / órgão" value={[process.tribunal, process.vara].filter(Boolean).join(" · ")} />
                                <Detail label="Responsável" value={process.usuarios?.nome} />
                                <Detail label="Data do requerimento" value={displayDate(process.data_requerimento)} />
                                <Detail label="Processo originário" value={process.processo_originario} />
                                <Detail label="Classe processual" value={process.classe_processual} />
                                <Detail label="CNJ" value={process.numero_cnj} />
                              </div>
                              <div className="mt-4 rounded-xl border border-gold/20 bg-gold-soft/30 px-3 py-2.5 dark:border-[#D4AF37]/25 dark:bg-[#D4AF37]/15">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-[9px] font-black uppercase tracking-[0.13em] text-gold-dark dark:text-[#E5C158]">Última movimentação</p>
                                  {process.ultima_movimentacao && (
                                    <time
                                      dateTime={process.ultima_movimentacao.data_hora ?? process.ultima_movimentacao.data_movimento}
                                      className="shrink-0 text-[9px] font-semibold text-stone-500 dark:text-zinc-400"
                                    >
                                      {movementDateLabel(process.ultima_movimentacao)}
                                    </time>
                                  )}
                                </div>
                                <p className="mt-1 line-clamp-2 break-words text-[10px] leading-relaxed text-stone-700 dark:text-zinc-200">
                                  {process.ultima_movimentacao?.descricao ?? "Ainda não há movimentações registradas."}
                                </p>
                              </div>
                              {process.observacoes && (
                                <p className="mt-3 line-clamp-2 border-t border-stone-100 pt-2 text-[10px] leading-relaxed text-stone-500 dark:border-zinc-800 dark:text-zinc-400">
                                  {process.observacoes}
                                </p>
                              )}
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-stone-100 pt-3 dark:border-zinc-800">
                              {process.valor_causa != null && (
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-stone-600 dark:text-zinc-300">
                                  <CircleDollarSign className="h-3.5 w-3.5 text-gold-dark dark:text-[#E5C158]" aria-hidden="true" />
                                  Causa {formatCurrency(Number(process.valor_causa))}
                                </span>
                              )}
                              {process.honorarios?.valor_fixo != null && (
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-stone-600 dark:text-zinc-300">
                                  <FileText className="h-3.5 w-3.5 text-gold-dark dark:text-[#E5C158]" aria-hidden="true" />
                                  Honorários {formatCurrency(Number(process.honorarios.valor_fixo))}
                                </span>
                              )}
                              {process.honorarios?.percentual_exito != null && (
                                <span className="text-[10px] font-semibold text-stone-600 dark:text-zinc-300">{process.honorarios.percentual_exito}% de êxito</span>
                              )}
                              {process.honorarios?.contingenciamento && process.honorarios.contingenciamento !== "nao" && (
                                <span className="text-[10px] font-semibold text-stone-600 dark:text-zinc-300">Contingenciamento {process.honorarios.contingenciamento}</span>
                              )}
                              {displayDate(process.data_requerimento) && (
                                <span className="inline-flex items-center gap-1.5 text-[10px] text-stone-400 dark:text-zinc-400">
                                  <CalendarDays className="h-3 w-3" aria-hidden="true" />
                                  {displayDate(process.data_requerimento)}
                                </span>
                              )}
                              {syncDate && <span className="text-[10px] text-stone-400 dark:text-zinc-400">Sync CNJ {syncDate.toLocaleDateString("pt-BR")}</span>}
                            </div>
                          </motion.div>,
                          document.body
                        )}
                    </article>
                  );
                })}
              {hiddenCount > 0 && (
                <div className="col-span-full flex justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => setVisibleLimit((current) => current + PAGE_SIZE)}
                    className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-xs font-bold text-stone-700 transition-colors hover:border-gold/50 hover:text-gold-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/25 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-gold/50 dark:hover:text-[#E5C158]"
                  >
                    Carregar mais ({hiddenCount} restante{hiddenCount === 1 ? "" : "s"})
                  </button>
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  );
}
