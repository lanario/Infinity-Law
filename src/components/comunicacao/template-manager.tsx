"use client";

import { startTransition, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Archive, FileText, Plus, Save, X } from "lucide-react";
import { arquivarTemplate, salvarTemplate } from "@/app/actions/comunicacao";

type Template = { id: string; nome: string; categoria: string | null; corpo: string };
const field = "mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2.5 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-gold/70 focus:bg-white focus:ring-4 focus:ring-gold/10 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-[#D4AF37]/70 dark:focus:bg-zinc-900";

export function TemplateManager({ initialTemplates, canWrite }: { initialTemplates: Template[]; canWrite: boolean }) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [editing, setEditing] = useState<Template | null>(null);
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [corpo, setCorpo] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function start(template?: Template) {
    setEditing(template ?? null);
    setNome(template?.nome ?? "");
    setCategoria(template?.categoria ?? "");
    setCorpo(template?.corpo ?? "");
    setError("");
    setOpen(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const result = await salvarTemplate({ nome, categoria, corpo }, editing?.id);
      if ("error" in result) { setError(result.error); return; }
      const saved = { id: result.id, nome: nome.trim(), categoria: categoria.trim() || null, corpo: corpo.trim() };
      setTemplates((current) => current.some((item) => item.id === saved.id) ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved]);
      setOpen(false);
      startTransition(() => router.refresh());
    } catch { setError("Não foi possível salvar o modelo agora."); }
    finally { setSaving(false); }
  }

  async function archive(template: Template) {
    if (!window.confirm(`Arquivar o modelo “${template.nome}”?`)) return;
    const result = await arquivarTemplate(template.id);
    if ("error" in result) { setError(result.error); return; }
    setTemplates((current) => current.filter((item) => item.id !== template.id));
    startTransition(() => router.refresh());
  }

  return (
    <section className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_8px_24px_-20px_rgba(23,25,26,.4)] dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div><h2 className="text-sm font-black text-[#17191a] dark:text-zinc-100">Modelos de mensagem</h2><p className="mt-1 text-xs text-stone-400 dark:text-zinc-400">Use variáveis como {"{{nome}}"} e personalize antes do envio.</p></div>
        {canWrite && <button type="button" onClick={() => start()} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-[#17191a] px-3 text-xs font-bold text-white transition hover:bg-[#303334] dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"><Plus className="h-3.5 w-3.5" /> Novo modelo</button>}
      </div>
      {error && <p role="status" className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">{error}</p>}
      {templates.length ? (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => <article key={template.id} className="rounded-xl border border-stone-100 bg-stone-50/50 p-3 transition hover:border-gold/30 hover:bg-white dark:border-zinc-800 dark:bg-zinc-950/60 dark:hover:border-[#D4AF37]/40 dark:hover:bg-zinc-800/60">
            <div className="flex items-start gap-2"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold-soft text-gold-dark dark:bg-[#D4AF37]/15 dark:text-[#E5C158]"><FileText className="h-4 w-4" /></span><div className="min-w-0 flex-1"><h3 className="truncate text-xs font-bold text-stone-800 dark:text-zinc-100">{template.nome}</h3><p className="mt-0.5 text-[10px] text-stone-400 dark:text-zinc-400">{template.categoria || "Geral"}</p></div></div>
            <p className="mt-3 line-clamp-2 whitespace-pre-wrap text-[11px] leading-relaxed text-stone-500 dark:text-zinc-400">{template.corpo}</p>
            {canWrite && <div className="mt-3 flex gap-2 border-t border-stone-100 pt-2 dark:border-zinc-800"><button type="button" onClick={() => start(template)} className="text-[10px] font-bold text-gold-dark hover:underline dark:text-[#E5C158]">Editar</button><button type="button" onClick={() => archive(template)} className="inline-flex items-center gap-1 text-[10px] font-bold text-stone-400 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400"><Archive className="h-3 w-3" /> Arquivar</button></div>}
          </article>)}
        </div>
      ) : <div className="rounded-xl border border-dashed border-stone-200 px-4 py-8 text-center dark:border-zinc-800"><FileText className="mx-auto h-6 w-6 text-stone-300 dark:text-zinc-600" /><p className="mt-2 text-xs font-semibold text-stone-600 dark:text-zinc-300">Nenhum modelo ativo</p><p className="mt-1 text-[11px] text-stone-400 dark:text-zinc-400">Crie mensagens reutilizáveis para agilizar o atendimento.</p></div>}

      <AnimatePresence>
        {open && <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-[#17191a]/45 p-0 backdrop-blur-sm sm:items-center sm:p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.section role="dialog" aria-modal="true" aria-labelledby="template-dialog-title" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl dark:border dark:border-zinc-800 dark:bg-zinc-900 sm:rounded-3xl sm:p-6">
            <form onSubmit={submit} className="space-y-4">
              <div className="flex items-center justify-between"><div><h3 id="template-dialog-title" className="text-base font-black text-[#17191a] dark:text-zinc-100">{editing ? "Editar modelo" : "Novo modelo"}</h3><p className="mt-1 text-xs text-stone-400 dark:text-zinc-400">Variáveis aparecem como campos no envio.</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 dark:text-zinc-400 dark:hover:bg-zinc-800"><X className="h-4 w-4" /></button></div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-zinc-300">Nome<input autoFocus required maxLength={80} value={nome} onChange={(event) => setNome(event.target.value)} className={field} placeholder="Ex.: Atualização de processo" /></label>
              <label className="block text-xs font-semibold text-stone-600 dark:text-zinc-300">Categoria<input maxLength={60} value={categoria} onChange={(event) => setCategoria(event.target.value)} className={field} placeholder="Ex.: Atendimento" /></label>
              <label className="block text-xs font-semibold text-stone-600 dark:text-zinc-300">Mensagem<textarea required maxLength={4096} rows={6} value={corpo} onChange={(event) => setCorpo(event.target.value)} className={field} placeholder="Olá, {{nome}}..." /><span className="mt-1 block text-right text-[10px] text-stone-400 dark:text-zinc-400">{corpo.length}/4096</span></label>
              {error && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
              <div className="flex justify-end gap-2 border-t border-stone-100 pt-4 dark:border-zinc-800"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-bold text-stone-600 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">Cancelar</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-xs font-bold text-white hover:bg-gold-hover disabled:opacity-50"><Save className="h-3.5 w-3.5" />{saving ? "Salvando..." : "Salvar modelo"}</button></div>
            </form>
          </motion.section>
        </motion.div>}
      </AnimatePresence>
    </section>
  );
}
