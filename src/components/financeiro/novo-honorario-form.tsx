"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, CalendarDays, CheckCircle2, FileText, UserRound } from "lucide-react";
import { salvarHonorario } from "@/app/actions/financeiro";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";

type ClienteOption = { id: string; nome: string };
type ProcessoOption = { id: string; numero_cnj: string | null; tipo_acao: string | null };
type TipoHonorario = "fixo" | "exito" | "misto";

function localDate() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function NovoHonorarioForm({ clientes, processos }: { clientes: ClienteOption[]; processos: ProcessoOption[] }) {
  const router = useRouter();
  const [clienteId, setClienteId] = useState("");
  const [processoId, setProcessoId] = useState("");
  const [tipo, setTipo] = useState<TipoHonorario>("fixo");
  const [descricao, setDescricao] = useState("");
  const [valorFixo, setValorFixo] = useState("");
  const [percentual, setPercentual] = useState("");
  const [baseExito, setBaseExito] = useState("");
  const [parcelas, setParcelas] = useState("1");
  const [primeiroVencimento, setPrimeiroVencimento] = useState(localDate);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const result = await salvarHonorario({
        cliente_id: clienteId,
        processo_id: processoId || null,
        tipo,
        descricao,
        valor_fixo: tipo === "exito" ? null : Number(valorFixo) || null,
        percentual_exito: tipo === "fixo" ? null : Number(percentual) || null,
        base_calculo_exito: baseExito,
        n_parcelas: tipo === "exito" ? 1 : Number(parcelas) || 1,
        data_primeira_parcela: primeiroVencimento,
      });
      if ("error" in result) {
        setMessage({ kind: "error", text: result.error });
        return;
      }
      setMessage({ kind: "success", text: "Honorário e parcelas salvos com sucesso." });
      router.push("/financeiro#honorarios");
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: "Não foi possível salvar. Tente novamente." });
    } finally {
      setSaving(false);
    }
  }

  const fieldClass = "mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-50/60 px-3.5 py-2.5 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-gold/70 focus:bg-white focus:ring-4 focus:ring-gold/10 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:bg-zinc-900";

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <Link href="/financeiro" className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 transition hover:text-gold-dark dark:hover:text-gold"><ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Voltar ao financeiro</Link>
        <h2 className="mt-2 text-xl font-black tracking-tight text-[#17191a]">Novo contrato de honorários</h2>
        <p className="mt-1 text-sm text-stone-500">Vincule o contrato ao cliente e programe cobranças recorrentes quando aplicável.</p>
      </div>

      <form onSubmit={submit} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-[0_8px_24px_-20px_rgba(23,25,26,0.4)] sm:p-6">
            <div className="mb-5 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-soft text-gold-dark dark:bg-gold/15 dark:text-gold"><UserRound className="h-5 w-5" aria-hidden="true" /></span><div><h3 className="text-sm font-black text-[#17191a]">Vínculos</h3><p className="mt-0.5 text-xs text-stone-400">Selecione cliente e, se houver, o processo relacionado</p></div></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-stone-600">Cliente <span className="text-gold-dark dark:text-gold">*</span><select required value={clienteId} onChange={(event) => setClienteId(event.target.value)} className={fieldClass}><option value="">Selecione um cliente</option>{clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>)}</select></label>
              <label className="text-xs font-semibold text-stone-600">Processo vinculado<select value={processoId} onChange={(event) => setProcessoId(event.target.value)} className={fieldClass}><option value="">Sem processo específico</option>{processos.map((processo) => <option key={processo.id} value={processo.id}>{processo.numero_cnj || processo.tipo_acao || "Processo sem identificação"}</option>)}</select></label>
            </div>
            {clientes.length === 0 && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">Cadastre um cliente ativo antes de criar um contrato de honorários.</p>}
          </section>

          <section className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-[0_8px_24px_-20px_rgba(23,25,26,0.4)] sm:p-6">
            <div className="mb-5 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#17191a] text-gold dark:bg-zinc-800"><FileText className="h-5 w-5" aria-hidden="true" /></span><div><h3 className="text-sm font-black text-[#17191a]">Condições do contrato</h3><p className="mt-0.5 text-xs text-stone-400">Defina o modelo de cobrança e os valores</p></div></div>
            <div className="grid grid-cols-3 gap-2 rounded-xl bg-stone-200/60 p-1 dark:bg-zinc-800/90">
              {([{ value: "fixo", label: "Fixo" }, { value: "exito", label: "Êxito" }, { value: "misto", label: "Misto" }] as const).map((option) => <button key={option.value} type="button" onClick={() => setTipo(option.value)} aria-pressed={tipo === option.value} className={cn("h-10 rounded-lg text-xs font-bold transition", tipo === option.value ? "bg-white text-[#17191a] shadow-sm dark:bg-gold dark:text-neutral-950" : "text-stone-500 hover:text-stone-800 dark:text-zinc-400 dark:hover:text-zinc-100")}>{option.label}</button>)}
            </div>
            <label className="mt-4 block text-xs font-semibold text-stone-600">Descrição do serviço<input value={descricao} onChange={(event) => setDescricao(event.target.value)} placeholder="Ex.: Acompanhamento processual e recursos" className={fieldClass} /></label>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {(tipo === "fixo" || tipo === "misto") && <label className="text-xs font-semibold text-stone-600">Valor fixo total (R$) <span className="text-gold-dark dark:text-gold">*</span><input type="number" min="0.01" step="0.01" required value={valorFixo} onChange={(event) => setValorFixo(event.target.value)} placeholder="0,00" className={fieldClass} /></label>}
              {(tipo === "exito" || tipo === "misto") && <label className="text-xs font-semibold text-stone-600">Percentual de êxito (%) <span className="text-gold-dark dark:text-gold">*</span><input type="number" min="0.01" max="100" step="0.01" required value={percentual} onChange={(event) => setPercentual(event.target.value)} placeholder="15" className={fieldClass} /></label>}
              {(tipo === "exito" || tipo === "misto") && <label className="text-xs font-semibold text-stone-600 sm:col-span-2">Base de cálculo<input value={baseExito} onChange={(event) => setBaseExito(event.target.value)} placeholder="Ex.: proveito econômico líquido" className={fieldClass} /></label>}
            </div>
          </section>

          {(tipo === "fixo" || tipo === "misto") && <section className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-[0_8px_24px_-20px_rgba(23,25,26,0.4)] sm:p-6">
            <div className="mb-5 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-soft text-gold-dark dark:bg-gold/15 dark:text-gold"><CalendarDays className="h-5 w-5" aria-hidden="true" /></span><div><h3 className="text-sm font-black text-[#17191a]">Parcelamento</h3><p className="mt-0.5 text-xs text-stone-400">As parcelas serão criadas automaticamente</p></div></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-stone-600">Número de parcelas<input type="number" min="1" max="120" step="1" required value={parcelas} onChange={(event) => setParcelas(event.target.value)} className={fieldClass} /></label>
              <DatePicker label="Primeiro vencimento" required value={primeiroVencimento} onChange={setPrimeiroVencimento} inputClassName="bg-stone-50/60 dark:bg-zinc-800/80 dark:border-zinc-700 dark:text-zinc-100" />
            </div>
          </section>}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-stone-200/80 bg-[#17191a] p-5 text-white shadow-[0_12px_32px_-24px_rgba(23,25,26,0.8)] dark:border-zinc-800"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-gold">Resumo</p><p className="mt-3 text-sm font-black">{clientes.find((cliente) => cliente.id === clienteId)?.nome || "Selecione um cliente"}</p><p className="mt-1 text-xs text-white/50">Honorários {tipo === "fixo" ? "fixos" : tipo === "exito" ? "por êxito" : "mistos"}</p><div className="mt-5 border-t border-white/10 pt-4"><p className="text-[10px] text-white/45">Valor fixo</p><p className="mt-1 text-lg font-black text-gold">{valorFixo ? Number(valorFixo).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}</p>{(tipo === "exito" || tipo === "misto") && <p className="mt-2 text-xs text-white/75">{percentual || "0"}% de êxito</p>}</div>{(tipo === "fixo" || tipo === "misto") && <p className="mt-4 text-[11px] text-white/55">{parcelas || 1} parcela(s), a partir de {new Date(`${primeiroVencimento}T12:00:00`).toLocaleDateString("pt-BR")}</p>}</div>
          <div className="rounded-2xl border border-gold/20 bg-gold-soft/60 p-4 dark:border-gold/25 dark:bg-gold/10"><p className="text-xs font-bold text-gold-dark dark:text-gold">Geração de cobranças</p><p className="mt-1 text-[11px] leading-relaxed text-stone-600 dark:text-zinc-300">O valor fixo será dividido em parcelas com ajuste automático de centavos. Contratos somente por êxito não geram parcelas antecipadas.</p></div>
        </aside>

        <div className="xl:col-span-2">
          <AnimatePresence mode="wait">{message && <motion.p key={message.text} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="status" className={cn("rounded-xl border px-4 py-3 text-sm", message.kind === "error" ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300")}>{message.text}</motion.p>}</AnimatePresence>
          <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Link href="/financeiro" className="inline-flex h-11 items-center justify-center rounded-xl border border-stone-200 bg-white px-5 text-sm font-bold text-stone-600 transition hover:bg-stone-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700">Cancelar</Link>
            <button type="submit" disabled={saving || clientes.length === 0} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gold px-5 text-sm font-bold text-white shadow-sm transition hover:bg-gold-hover disabled:cursor-not-allowed disabled:opacity-60">{saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}{saving ? "Salvando..." : "Salvar contrato"}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
