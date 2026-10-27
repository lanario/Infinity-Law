"use client";

import { useState } from "react";
import { BriefcaseBusiness, ChartNoAxesColumnIncreasing, FileText, Table, Download, Loader2, CalendarRange, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";

type TipoRelatorio = "faturamento" | "processos" | "responsavel";

const RELATORIOS = [
  { id: "faturamento" as TipoRelatorio, label: "Faturamento por período", detail: "Parcelas, valores e situação de pagamento", icon: FileText },
  { id: "processos" as TipoRelatorio, label: "Processos por área", detail: "Distribuição dos casos por área do direito", icon: Table },
  { id: "responsavel" as TipoRelatorio, label: "Processos por responsável", detail: "Carteira ativa e encerrada por integrante", icon: BriefcaseBusiness },
];

function localDate(date: Date) {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 10);
}

export function RelatoriosPanel() {
  const [tipo, setTipo] = useState<TipoRelatorio>("faturamento");
  const [inicio, setInicio] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return localDate(d);
  });
  const [fim, setFim] = useState(() => localDate(new Date()));
  const [loading, setLoading] = useState<"pdf" | "excel" | null>(null);
  const [error, setError] = useState("");

  async function download(formato: "pdf" | "excel") {
    if (!inicio || !fim || inicio > fim) { setError("A data inicial deve ser anterior ou igual à data final."); return; }
    setLoading(formato);
    setError("");
    try {
      const res = await fetch(`/api/relatorios/${formato}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, periodo: { inicio, fim } }),
      });

      if (!res.ok) {
        const response = await res.json().catch(() => null);
        throw new Error(response?.error ?? "Falha ao gerar relatório");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio-${tipo}-${inicio}-${fim}.${formato === "pdf" ? "pdf" : "xlsx"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro ao gerar relatório. Tente novamente.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="max-w-5xl space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Relatórios disponíveis", value: "03", icon: ChartNoAxesColumnIncreasing },
          { label: "Formatos de exportação", value: "PDF · XLSX", icon: FileText },
          { label: "Acesso", value: "Dados do escritório", icon: CheckCircle2 },
        ].map((item, index) => <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-stone-200/80 bg-white px-4 py-4 shadow-[0_8px_24px_-20px_rgba(23,25,26,.4)]"><span className={cn("h-8 w-1 rounded-full", index === 1 ? "bg-gold" : "bg-[#17191a]")} /><div className="min-w-0 flex-1"><p className="text-base font-black text-[#17191a]">{item.value}</p><p className="mt-1 text-[10px] text-stone-500">{item.label}</p></div><item.icon className="h-4 w-4 text-stone-300" /></div>)}
      </div>

      <section className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_8px_24px_-20px_rgba(23,25,26,.4)] sm:p-6">
        <div className="mb-5 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#17191a] text-gold"><CalendarRange className="h-5 w-5" /></span><div><h2 className="text-sm font-black text-[#17191a]">Gerar relatório</h2><p className="mt-1 text-xs text-stone-400">Selecione a visão e o período para exportar.</p></div></div>
        <div>
          <label className="mb-2 block text-xs font-semibold text-stone-600">Tipo de relatório</label>
          <div className="grid gap-2 md:grid-cols-3">
            {RELATORIOS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setTipo(r.id)}
                aria-pressed={tipo === r.id}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all",
                  tipo === r.id
                    ? "border-gold/50 bg-gold-soft text-gold-dark shadow-sm"
                    : "border-stone-200 text-stone-700 hover:border-gold/35 hover:bg-stone-50"
                )}
              >
                <r.icon className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span><span className="block text-xs font-bold">{r.label}</span><span className="mt-1 block text-[10px] leading-relaxed opacity-70">{r.detail}</span></span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <DatePicker label="Data inicial" value={inicio} onChange={setInicio} inputClassName="bg-stone-50/60" />
          <DatePicker label="Data final" value={fim} onChange={setFim} inputClassName="bg-stone-50/60" />
        </div>

        {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">{error}</p>}
        <div className="mt-5 flex flex-col gap-2 border-t border-stone-100 pt-4 sm:flex-row sm:justify-end">
          <button
            onClick={() => download("pdf")}
            disabled={loading !== null}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#17191a] px-5 text-xs font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#303334] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading === "pdf" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="h-4 w-4" aria-hidden="true" />
            )}
            Exportar PDF
          </button>
          <button
            onClick={() => download("excel")}
            disabled={loading !== null}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gold px-5 text-xs font-bold text-white transition hover:-translate-y-0.5 hover:bg-gold-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading === "excel" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Table className="h-4 w-4" aria-hidden="true" />
            )}
            Exportar Excel
          </button>
        </div>
      </section>
    </div>
  );
}
