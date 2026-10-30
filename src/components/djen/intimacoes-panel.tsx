"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState, type FormEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Gavel } from "lucide-react";
import { DjenMonitoringSection } from "@/components/djen/intimacoes-monitoring-section";
import { DjenPublicationsSection } from "@/components/djen/intimacoes-publications-section";
import { DjenClientSearchSection } from "@/components/djen/client-search-section";
import { validateDateRange } from "@/lib/djen/validation";
import type { DjenIntimacoesPanelProps, Message, Monitoramento } from "./types";

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
  const [numeroOab, setNumeroOab] = useState("");
  const [ufOab, setUfOab] = useState("SP");
  const [dataInicio, setDataInicio] = useState(defaultStartDate);
  const [dataFim, setDataFim] = useState(today);
  const [saving, setSaving] = useState(false);
  const [syncingMonitorId, setSyncingMonitorId] = useState<string | null>(null);
  const [updatingMonitorId, setUpdatingMonitorId] = useState<string | null>(null);
  const [deletingMonitorId, setDeletingMonitorId] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

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
          ? payload.rateLimit as Record<string, unknown>
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

  return (
    <div className="space-y-6">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.22, ease: "easeOut" }}
      >
        <DjenPublicationsSection
          publicacoes={publicacoes}
          associacoes={associacoes}
          monitoramentos={monitoramentos}
          processos={processos}
          podeLerProcessos={podeLerProcessos}
          publicationError={publicationError}
          relatedDataError={relatedDataError}
        />
      </motion.div>

      <section aria-labelledby="consultas-djen-heading">
        <div className="mb-4 flex items-center gap-3 border-b border-gray-200 pb-3 dark:border-zinc-800">
          <div className="rounded-xl bg-gold-soft p-2 text-gold-dark dark:bg-[#D4AF37]/15 dark:text-[#E5C158]">
            <Gavel className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 id="consultas-djen-heading" className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
              Monitoramento e consultas
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
              Atualize as publicações por OAB ou localize candidatos pelo cadastro do cliente.
            </p>
          </div>
        </div>
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2, delay: reduceMotion ? 0 : 0.04, ease: "easeOut" }}
          className="space-y-6"
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
          <DjenClientSearchSection
            today={today}
            defaultStartDate={defaultStartDate}
            podePesquisar={podePesquisarCliente}
            podeLerProcessos={podeLerProcessos}
            podeAssociarProcesso={podeAssociarProcesso}
          />
        </motion.div>
      </section>
    </div>
  );
}
