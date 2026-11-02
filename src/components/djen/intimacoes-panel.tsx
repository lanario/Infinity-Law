"use client";

import { useRouter } from "next/navigation";
import { startTransition, useMemo, useState, type FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BellRing, FileSearch, ScrollText } from "lucide-react";
import { DjenMonitoringSection } from "@/components/djen/intimacoes-monitoring-section";
import { DjenPublicationsSection } from "@/components/djen/intimacoes-publications-section";
import { DjenClientSearchSection } from "@/components/djen/client-search-section";
import { validateDateRange } from "@/lib/djen/validation";
import type { DjenIntimacoesPanelProps, Message, Monitoramento } from "./types";

type TabKey = "publicacoes" | "monitoramento" | "cliente";

function formatDate(value: string | null) {
  if (!value) return "Data não informada";
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString("pt-BR", { timeZone: "UTC", dateStyle: "medium" })
    : "Data não informada";
}

async function readResponse(response: Response) {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

export function DjenIntimacoesPanel({
  monitoramentos,
  publicacoes,
  associacoes,
  processos,
  podeEditar,
  podeExcluir,
  podePesquisarCliente,
  podeLerProcessos,
  podeAssociarProcesso,
  today,
  defaultStartDate,
  publicationError,
  monitoringError,
  relatedDataError,
}: DjenIntimacoesPanelProps) {
  const router = useRouter();
  const reduceMotion = useReducedMotion() ?? false;

  const [activeTab, setActiveTab] = useState<TabKey>("publicacoes");
  const [numeroOab, setNumeroOab] = useState("");
  const [ufOab, setUfOab] = useState("SP");
  const [dataInicio, setDataInicio] = useState(defaultStartDate);
  const [dataFim, setDataFim] = useState(today);
  const [saving, setSaving] = useState(false);
  const [syncingMonitorId, setSyncingMonitorId] = useState<string | null>(null);
  const [updatingMonitorId, setUpdatingMonitorId] = useState<string | null>(null);
  const [deletingMonitorId, setDeletingMonitorId] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  const activeMonitorsCount = useMemo(
    () => monitoramentos.filter((m) => m.ativo).length,
    [monitoramentos]
  );

  async function addMonitor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!podeEditar || saving) return;

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/djen/oabs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ numeroOab, ufOab }),
      });
      const payload = await readResponse(response);

      if (!response.ok) {
        setMessage({
          kind: "error",
          text: typeof payload.error === "string" ? payload.error : "Não foi possível salvar a OAB.",
        });
        return;
      }

      setNumeroOab("");
      setMessage({ kind: "success", text: "OAB adicionada ao monitoramento." });
      startTransition(() => router.refresh());
    } catch {
      setMessage({ kind: "error", text: "Não foi possível salvar a OAB. Tente novamente." });
    } finally {
      setSaving(false);
    }
  }

  async function synchronize(monitoramento: Monitoramento) {
    if (!podeEditar || syncingMonitorId) return;

    const rangeError = validateDateRange(dataInicio, dataFim, today);
    if (rangeError) {
      setMessage({ kind: "error", text: rangeError });
      return;
    }

    setSyncingMonitorId(monitoramento.id);
    setMessage(null);

    try {
      const response = await fetch("/api/djen/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          monitoramentoId: monitoramento.id,
          dataInicio,
          dataFim,
        }),
      });
      const payload = await readResponse(response);

      if (!response.ok) {
        const error = typeof payload.error === "string"
          ? payload.error
          : "Não foi possível consultar o DJEN.";
        const waitSeconds = typeof payload.waitSeconds === "number" ? payload.waitSeconds : null;
        const rateLimit = typeof payload.rateLimit === "object" && payload.rateLimit !== null
          ? (payload.rateLimit as Record<string, unknown>)
          : null;
        const remaining = typeof rateLimit?.remaining === "string"
          ? ` Consultas restantes informadas pelo CNJ: ${rateLimit.remaining}.`
          : "";
        const retryGuidance = response.status === 429
          ? waitSeconds !== null
            ? ` O CNJ indicou aguardar ${waitSeconds} segundos.`
            : " Não houve repetição automática; aguarde antes de tentar novamente."
          : "";
        const partialGuidance = payload.partial === true
          ? " Parte dos resultados pode já ter sido salva; repetir a consulta é seguro e não duplica publicações."
          : "";
        setMessage({
          kind: "error",
          text: `${error}${retryGuidance}${remaining}${partialGuidance}`,
        });
        return;
      }

      const count = typeof payload.count === "number" ? payload.count : 0;
      const inserted = typeof payload.novasPublicacoes === "number" ? payload.novasPublicacoes : 0;
      const empty = payload.semResultados === true;
      setMessage({
        kind: "success",
        text: empty
          ? `Consulta concluída. Nenhuma publicação foi disponibilizada para esta OAB entre ${formatDate(dataInicio)} e ${formatDate(dataFim)}.`
          : `Consulta concluída: ${count} resultado(s), sendo ${inserted} novo(s).`,
      });
      startTransition(() => router.refresh());
    } catch {
      setMessage({
        kind: "error",
        text: "Não foi possível consultar o DJEN. Nenhum resultado foi marcado como vazio.",
      });
    } finally {
      setSyncingMonitorId(null);
    }
  }

  async function setMonitorActive(monitoramento: Monitoramento, ativo: boolean) {
    if (!podeEditar || updatingMonitorId) return;

    setUpdatingMonitorId(monitoramento.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/djen/oabs/${monitoramento.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ativo }),
      });
      const payload = await readResponse(response);

      if (!response.ok) {
        setMessage({
          kind: "error",
          text: typeof payload.error === "string" ? payload.error : "Não foi possível atualizar a OAB.",
        });
        return;
      }

      setMessage({
        kind: "success",
        text: ativo ? "Monitoramento reativado." : "Monitoramento pausado. O histórico foi mantido.",
      });
      startTransition(() => router.refresh());
    } catch {
      setMessage({ kind: "error", text: "Não foi possível atualizar a OAB. Tente novamente." });
    } finally {
      setUpdatingMonitorId(null);
    }
  }

  async function deleteMonitor(monitoramento: Monitoramento): Promise<string | null> {
    if (!podeExcluir || syncingMonitorId || updatingMonitorId || deletingMonitorId) {
      return "Aguarde a operação em andamento antes de excluir esta OAB.";
    }

    setDeletingMonitorId(monitoramento.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/djen/oabs/${monitoramento.id}`, {
        method: "DELETE",
      });
      const payload = await readResponse(response);

      if (!response.ok) {
        const error = typeof payload.error === "string"
          ? payload.error
          : "Não foi possível excluir o monitoramento.";
        setMessage({ kind: "error", text: error });
        return error;
      }

      setMessage({
        kind: "success",
        text: `Monitoramento da OAB ${monitoramento.numero_oab}/${monitoramento.uf_oab} excluído. As intimações salvas foram preservadas.`,
      });
      startTransition(() => router.refresh());
      return null;
    } catch {
      const error = "Não foi possível excluir o monitoramento. Tente novamente.";
      setMessage({ kind: "error", text: error });
      return error;
    } finally {
      setDeletingMonitorId(null);
    }
  }

  const tabs: Array<{
    id: TabKey;
    label: string;
    icon: typeof ScrollText;
    badge?: string | number;
    badgeVariant?: "gold" | "emerald" | "neutral";
  }> = [
    {
      id: "publicacoes",
      label: "Publicações Salvas",
      icon: ScrollText,
      badge: publicacoes.length,
      badgeVariant: "gold",
    },
    {
      id: "monitoramento",
      label: "Monitoramento de OABs",
      icon: BellRing,
      badge: `${activeMonitorsCount} ativa${activeMonitorsCount === 1 ? "" : "s"}`,
      badgeVariant: activeMonitorsCount > 0 ? "emerald" : "neutral",
    },
    {
      id: "cliente",
      label: "Pesquisa por Cliente",
      icon: FileSearch,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Segmented Control - Modern Onyx & Gold */}
      <nav
        aria-label="Abas do painel de intimações"
        className="relative flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-stone-200/80 bg-stone-100/80 p-1.5 backdrop-blur-sm dark:border-zinc-800/80 dark:bg-[#17191A]"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`relative z-10 flex min-h-[44px] shrink-0 sm:flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold tracking-tight transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 sm:px-4 sm:text-sm ${
                isActive
                  ? "text-[#101213] dark:text-zinc-100"
                  : "text-stone-600 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="intimacoesActiveTab"
                  className="absolute inset-0 z-[-1] rounded-xl border border-stone-200/70 bg-white shadow-sm dark:border-zinc-700/60 dark:bg-[#101213] dark:shadow-black/40"
                  transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 650, damping: 32 }}
                />
              )}
              <Icon
                className={`h-4 w-4 shrink-0 transition-colors ${
                  isActive
                    ? "text-gold-dark dark:text-[#E5C158]"
                    : "text-stone-400 dark:text-zinc-500"
                }`}
                aria-hidden="true"
              />
              <span className="whitespace-nowrap">{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold leading-none transition-colors ${
                    tab.badgeVariant === "gold"
                      ? "bg-gold/15 text-gold-dark dark:bg-gold/20 dark:text-[#E5C158]"
                      : tab.badgeVariant === "emerald"
                      ? "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                      : "bg-stone-200 text-stone-600 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Conteúdo dinâmico com AnimatePresence */}
      <AnimatePresence mode="wait">
        {activeTab === "publicacoes" && (
          <motion.div
            key="tab-publicacoes"
            role="tabpanel"
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: reduceMotion ? 0 : 0.12, ease: "easeOut" }}
          >
            <DjenPublicationsSection
              publicacoes={publicacoes}
              associacoes={associacoes}
              monitoramentos={monitoramentos}
              processos={processos}
              podeLerProcessos={podeLerProcessos}
              publicationError={publicationError}
              relatedDataError={relatedDataError}
              onGoToMonitoring={() => setActiveTab("monitoramento")}
              onGoToClientSearch={() => setActiveTab("cliente")}
            />
          </motion.div>
        )}

        {activeTab === "monitoramento" && (
          <motion.div
            key="tab-monitoramento"
            role="tabpanel"
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: reduceMotion ? 0 : 0.12, ease: "easeOut" }}
          >
            <DjenMonitoringSection
              monitoramentos={monitoramentos}
              podeEditar={podeEditar}
              podeExcluir={podeExcluir}
              today={today}
              dataInicio={dataInicio}
              dataFim={dataFim}
              onDataInicioChange={setDataInicio}
              onDataFimChange={setDataFim}
              numeroOab={numeroOab}
              onNumeroOabChange={setNumeroOab}
              ufOab={ufOab}
              onUfOabChange={setUfOab}
              saving={saving}
              syncingMonitorId={syncingMonitorId}
              updatingMonitorId={updatingMonitorId}
              deletingMonitorId={deletingMonitorId}
              message={message}
              loadError={monitoringError}
              onAddMonitor={addMonitor}
              onSynchronize={synchronize}
              onSetMonitorActive={setMonitorActive}
              onDeleteMonitor={deleteMonitor}
            />
          </motion.div>
        )}

        {activeTab === "cliente" && (
          <motion.div
            key="tab-cliente"
            role="tabpanel"
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: reduceMotion ? 0 : 0.12, ease: "easeOut" }}
          >
            <DjenClientSearchSection
              today={today}
              defaultStartDate={defaultStartDate}
              podePesquisar={podePesquisarCliente}
              podeLerProcessos={podeLerProcessos}
              podeAssociarProcesso={podeAssociarProcesso}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
