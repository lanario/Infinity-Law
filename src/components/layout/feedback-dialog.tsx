"use client";

import { useState, type FormEvent } from "react";
import { Bug, Lightbulb, Mail, MessageSquarePlus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUser } from "@/components/layout/user-context";
import { cn } from "@/lib/utils";

const FEEDBACK_EMAIL = "alanbarros.dev15@gmail.com";

type FeedbackKind = "problema" | "sugestao";

export function FeedbackDialog() {
  const user = useUser();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FeedbackKind>("problema");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [draftOpened, setDraftOpened] = useState(false);

  function openDialog() {
    setDraftOpened(false);
    setOpen(true);
  }

  function prepareEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedSubject = subject.trim();
    const trimmedDescription = description.trim();
    if (!trimmedSubject || !trimmedDescription) return;

    const emailSubject = encodeURIComponent(`[Infinity Law] ${kind === "problema" ? "Problema" : "Sugestão"}: ${trimmedSubject}`);
    const emailBody = encodeURIComponent([
      `Tipo: ${kind === "problema" ? "Problema" : "Sugestão"}`,
      `Enviado por: ${user?.nome ?? "Usuário do Infinity Law"}`,
      `E-mail de contato: ${user?.email ?? "Não informado"}`,
      `Página: ${window.location.pathname}`,
      "",
      "Descrição:",
      trimmedDescription,
    ].join("\n"));

    window.location.href = `mailto:${FEEDBACK_EMAIL}?subject=${emailSubject}&body=${emailBody}`;
    setDraftOpened(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="group hidden items-center gap-2 rounded-2xl border border-stone-200 bg-white/75 px-3 py-2 text-left shadow-[0_8px_20px_-18px_rgba(23,25,26,0.7)] transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/50 hover:bg-gold-soft focus:outline-none focus:ring-2 focus:ring-gold/25 md:flex"
        aria-label="Enviar feedback ou sugestão"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-md border border-gold/35 bg-gold-soft text-gold-dark transition-transform duration-200 group-hover:rotate-6">
          <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <span className="text-xs font-bold leading-tight text-[#343637]">Feedback e<br />Sugestões</span>
      </button>

      <button
        type="button"
        onClick={openDialog}
        className="flex h-10 w-10 items-center justify-center rounded-2xl border border-stone-200 bg-white/75 text-gold-dark shadow-[0_8px_20px_-18px_rgba(23,25,26,0.7)] transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/50 hover:bg-gold-soft focus:outline-none focus:ring-2 focus:ring-gold/25 md:hidden"
        aria-label="Enviar feedback ou sugestão"
      >
        <Lightbulb className="h-[18px] w-[18px]" aria-hidden="true" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="max-h-[calc(100dvh-1.5rem)] max-w-lg overflow-y-auto rounded-3xl border border-stone-200 bg-[#fcfcfb] p-0 shadow-[0_30px_100px_-35px_rgba(23,25,26,0.55)] sm:max-h-[calc(100dvh-3rem)]"
        >
          <div className="flex items-start justify-between gap-4 border-b border-stone-200/80 bg-white/80 px-5 py-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-soft text-gold-dark"><MessageSquarePlus className="h-5 w-5" aria-hidden="true" /></span>
              <div className="min-w-0">
                <DialogTitle className="text-base font-black text-[#17191a]">Feedback e sugestões</DialogTitle>
                <DialogDescription className="mt-1 text-xs text-stone-500">Conte o que aconteceu ou como podemos melhorar.</DialogDescription>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="-mr-1 -mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-stone-400 transition hover:bg-stone-100 hover:text-stone-700" aria-label="Fechar feedback"><X className="h-4 w-4" aria-hidden="true" /></button>
          </div>

          <form onSubmit={prepareEmail} className="space-y-4 p-5 sm:p-6">
            <fieldset>
              <legend className="mb-2 text-xs font-bold text-stone-700">O que deseja enviar?</legend>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: "problema", label: "Relatar problema", icon: Bug },
                  { value: "sugestao", label: "Enviar sugestão", icon: Lightbulb },
                ] as const).map(({ value, label, icon: Icon }) => (
                  <label key={value} className={cn("flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-3 text-xs font-bold transition", kind === value ? "border-gold/50 bg-gold-soft/50 text-gold-dark shadow-sm" : "border-stone-200 bg-white text-stone-500 hover:bg-stone-50")}>
                    <input type="radio" name="feedback-kind" value={value} checked={kind === value} onChange={() => { setKind(value); setDraftOpened(false); }} className="sr-only" />
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />{label}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="block text-xs font-bold text-stone-700">
              Assunto
              <input
                required
                maxLength={120}
                value={subject}
                onChange={(event) => { setSubject(event.target.value); setDraftOpened(false); }}
                placeholder={kind === "problema" ? "Ex.: erro ao abrir um processo" : "Ex.: melhoria na agenda"}
                className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-white px-3.5 text-sm font-medium text-[#17191a] outline-none transition placeholder:text-stone-400 focus:border-gold/60 focus:ring-4 focus:ring-gold/10"
              />
            </label>

            <label className="block text-xs font-bold text-stone-700">
              Descrição
              <textarea
                required
                minLength={10}
                maxLength={4000}
                rows={5}
                value={description}
                onChange={(event) => { setDescription(event.target.value); setDraftOpened(false); }}
                placeholder={kind === "problema" ? "Descreva o que aconteceu e, se possível, como reproduzir o problema." : "Explique sua ideia ou sugestão."}
                className="mt-1.5 w-full resize-y rounded-xl border border-stone-200 bg-white px-3.5 py-3 text-sm font-medium leading-relaxed text-[#17191a] outline-none transition placeholder:text-stone-400 focus:border-gold/60 focus:ring-4 focus:ring-gold/10"
              />
              <span className="mt-1 block text-right text-[10px] font-medium text-stone-400">Máximo de 4.000 caracteres</span>
            </label>

            <div className="flex items-start gap-2 rounded-xl border border-gold/15 bg-gold-soft/30 px-3 py-2.5 text-[11px] leading-relaxed text-stone-600">
              <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-dark" aria-hidden="true" />
              <p>O e-mail será preparado para <span className="font-bold text-stone-800">{FEEDBACK_EMAIL}</span>. Seu aplicativo de e-mail abrirá para você revisar e enviar.</p>
            </div>

            {draftOpened && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-semibold leading-relaxed text-emerald-700">Rascunho preparado. Conclua o envio pelo aplicativo de e-mail que foi aberto.</p>}

            <div className="flex flex-col-reverse gap-2 border-t border-stone-100 pt-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-xl border border-stone-200 bg-white px-4 text-xs font-bold text-stone-600 transition hover:bg-stone-50">Cancelar</button>
              <button type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl gold-sheen px-4 text-xs font-bold text-[#17191a] shadow-sm transition hover:opacity-95"><Mail className="h-3.5 w-3.5" aria-hidden="true" />Abrir e-mail para envio</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
