"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Archive, FileText, Plus, Save, X } from "lucide-react";
import { arquivarTemplate, salvarTemplate } from "@/app/actions/comunicacao";

type Template = { id: string; nome: string; categoria: string | null; corpo: string };
const field = "mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2.5 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-gold/70 focus:bg-white focus:ring-4 focus:ring-gold/10";

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
      router.refresh();
    } catch { setError("Não foi possível salvar o modelo agora."); }
    finally { setSaving(false); }
  }

  async function archive(template: Template) {
    if (!window.confirm(`Arquivar o modelo “${template.nome}”?`)) return;
    const result = await arquivarTemplate(template.id);
    if ("error" in result) { setError(result.error); return; }
    setTemplates((current) => current.filter((item) => item.id !== template.id));
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_8px_24px_-20px_rgba(23,25,26,.4)] sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div><h2 className="text-sm font-black text-[#17191a]">Modelos de mensagem</h2><p className="mt-1 text-xs text-stone-400">Use variáveis como {"{{nome}}"} e personalize antes do envio.</p></div>
        {canWrite && <button type="button" onClick={() => start()} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-[#17191a] px-3 text-xs font-bold text-white transition hover:bg-[#303334]"><Plus className="h-3.5 w-3.5" /> Novo modelo</button>}
      </div>
      {error && <p role="status" className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
      {templates.length ? (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => <article key={template.id} className="rounded-xl border border-stone-100 bg-stone-50/50 p-3 transition hover:border-gold/30 hover:bg-white">
            <div className="flex items-start gap-2"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold-soft text-gold-dark"><FileText className="h-4 w-4" /></span><div className="min-w-0 flex-1"><h3 className="truncate text-xs font-bold text-stone-800">{template.nome}</h3><p className="mt-0.5 text-[10px] text-stone-400">{template.categoria || "Geral"}</p></div></div>
            <p className="mt-3 line-clamp-2 whitespace-pre-wrap text-[11px] leading-relaxed text-stone-500">{template.corpo}</p>
            {canWrite && <div className="mt-3 flex gap-2 border-t border-stone-100 pt-2"><button type="button" onClick={() => start(template)} className="text-[10px] font-bold text-gold-dark hover:underline">Editar</button><button type="button" onClick={() => archive(template)} className="inline-flex items-center gap-1 text-[10px] font-bold text-stone-400 hover:text-rose-600"><Archive className="h-3 w-3" /> Arquivar</button></div>}
          </article>)}
        </div>
      ) : <div className="rounded-xl border border-dashed border-stone-200 px-4 py-8 text-center"><FileText className="mx-auto h-6 w-6 text-stone-300" /><p className="mt-2 text-xs font-semibold text-stone-600">Nenhum modelo ativo</p><p className="mt-1 text-[11px] text-stone-400">Crie mensagens reutilizáveis para agilizar o atendimento.</p></div>}

      <AnimatePresence>
        {open && <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-[#17191a]/45 p-0 backdrop-blur-sm sm:items-center sm:p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.section role="dialog" aria-modal="true" aria-labelledby="template-dialog-title" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6">
            <form onSubmit={submit} className="space-y-4">
              <div className="flex items-center justify-between"><div><h3 id="template-dialog-title" className="text-base font-black text-[#17191a]">{editing ? "Editar modelo" : "Novo modelo"}</h3><p className="mt-1 text-xs text-stone-400">Variáveis aparecem como campos no envio.</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="rounded-lg p-2 text-stone-400 hover:bg-stone-100"><X className="h-4 w-4" /></button></div>
              <label className="block text-xs font-semibold text-stone-600">Nome<input autoFocus required maxLength={80} value={nome} onChange={(event) => setNome(event.target.value)} className={field} placeholder="Ex.: Atualização de processo" /></label>
              <label className="block text-xs font-semibold text-stone-600">Categoria<input maxLength={60} value={categoria} onChange={(event) => setCategoria(event.target.value)} className={field} placeholder="Ex.: Atendimento" /></label>
              <label className="block text-xs font-semibold text-stone-600">Mensagem<textarea required maxLength={4096} rows={6} value={corpo} onChange={(event) => setCorpo(event.target.value)} className={field} placeholder="Olá, {{nome}}..." /><span className="mt-1 block text-right text-[10px] text-stone-400">{corpo.length}/4096</span></label>
              {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
              <div className="flex justify-end gap-2 border-t border-stone-100 pt-4"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-bold text-stone-600">Cancelar</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-xs font-bold text-white hover:bg-gold-hover disabled:opacity-50"><Save className="h-3.5 w-3.5" />{saving ? "Salvando..." : "Salvar modelo"}</button></div>
            </form>
          </motion.section>
        </motion.div>}
      </AnimatePresence>
    </section>
  );
}
