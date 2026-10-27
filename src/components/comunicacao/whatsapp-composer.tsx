"use client";

import { useState } from "react";
import { MessageCircle, Send, ChevronRight, ChevronLeft, CheckCircle2, Loader2 } from "lucide-react";
import { interpolate, extractVariables } from "@/lib/whatsapp/template-interpolator";
import { formatPhone } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Cliente = { id: string; nome: string; telefone: string | null };
type Template = { id: string; nome: string; categoria: string | null; corpo: string };

interface WhatsAppComposerProps {
  clientes: Cliente[];
  templates: Template[];
}

type Step = 1 | 2 | 3 | 4;

export function WhatsAppComposer({ clientes, templates }: WhatsAppComposerProps) {
  const [step, setStep] = useState<Step>(1);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [clienteSearch, setClienteSearch] = useState("");
  const [error, setError] = useState("");

  const filteredClientes = clientes.filter((c) =>
    c.nome.toLowerCase().includes(clienteSearch.toLowerCase())
  );

  const messageBody = selectedTemplate
    ? interpolate(selectedTemplate.corpo, variables)
    : customMessage;

  const templateVars = selectedTemplate
    ? extractVariables(selectedTemplate.corpo)
    : [];

  async function handleSend() {
    if (!selectedCliente?.telefone || !messageBody) return;
    setSending(true);
    setError("");
    const popup = window.open("about:blank", "_blank");
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteId: selectedCliente.id,
          telefone: selectedCliente.telefone,
          mensagem: messageBody,
          templateId: selectedTemplate?.id,
        }),
      });
      const payload = await res.json().catch(() => ({})) as { url?: string; error?: string };
      if (!res.ok || !payload.url) {
        popup?.close();
        setError(payload.error ?? "Não foi possível preparar a conversa. Tente novamente.");
        return;
      }
      setDone(true);
      if (popup) {
        popup.opener = null;
        popup.location.href = payload.url;
      }
      else window.location.href = payload.url;
    } catch {
      popup?.close();
      setError("Falha de conexão ao preparar a conversa. Tente novamente.");
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
        <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-gray-900">Conversa iniciada</h2>
        <p className="text-sm text-gray-500 mt-1">
          O WhatsApp foi aberto com a mensagem para {selectedCliente?.nome}.
        </p>
        <p className="text-xs text-gray-400 mt-2">
          ⚠️ &quot;Conversa iniciada&quot; não significa &quot;mensagem entregue&quot; — isso depende de o destinatário receber a conversa no WhatsApp.
        </p>
        <button
          onClick={() => {
            setStep(1);
            setSelectedCliente(null);
            setSelectedTemplate(null);
            setCustomMessage("");
            setVariables({});
            setDone(false);
          }}
          className="mt-6 inline-flex h-10 items-center rounded-xl bg-gold px-4 text-xs font-bold text-white transition hover:bg-gold-hover"
        >
          Nova mensagem
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {([1, 2, 3, 4] as Step[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
          <div className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold",
              step === s
                ? "bg-gold text-white"
                : step > s
                ? "bg-gold-soft text-gold-dark"
                : "bg-stone-100 text-stone-400"
            )}>
              {s}
            </div>
            {s < 4 && <div className={cn("h-px w-8", step > s ? "bg-gold" : "bg-stone-200")} />}
          </div>
        ))}
        <span className="ml-2 text-[10px] font-medium text-stone-400">
          {["Selecionar cliente", "Selecionar template", "Preencher variáveis", "Confirmar"][step - 1]}
        </span>
      </div>

      <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_8px_24px_-20px_rgba(23,25,26,.4)] sm:p-5">
        {error && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">{error}</p>}
        {/* Step 1: Select client */}
        {step === 1 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Selecionar cliente</h2>
            <input
              type="search"
              value={clienteSearch}
              onChange={(e) => setClienteSearch(e.target.value)}
              placeholder="Buscar cliente..."
              className="w-full rounded-xl border border-stone-200 bg-stone-50/60 px-3.5 py-2.5 text-sm outline-none transition focus:border-gold/70 focus:bg-white focus:ring-4 focus:ring-gold/10"
            />
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filteredClientes.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedCliente(c); setStep(2); }}
                  className="flex w-full items-center justify-between rounded-xl border border-transparent p-3 text-left transition-all hover:border-gold/25 hover:bg-stone-50"
                  disabled={!c.telefone}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">{c.nome}</p>
                    <p className="text-xs text-gray-400">
                      {c.telefone ? formatPhone(c.telefone) : "Sem telefone"}
                    </p>
                  </div>
                  {!c.telefone && (
                    <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
                      Sem tel.
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Select template */}
        {step === 2 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">
              Selecionar template para {selectedCliente?.nome}
            </h2>
            <div className="space-y-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setSelectedTemplate(t); setStep(3); }}
                className="w-full rounded-xl border border-stone-100 p-3 text-left transition-all hover:border-gold/50 hover:bg-gold-soft"
                >
                  <p className="text-sm font-medium text-gray-800">{t.nome}</p>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{t.corpo}</p>
                </button>
              ))}
              <button
                onClick={() => { setSelectedTemplate(null); setStep(3); }}
                className="w-full rounded-xl border border-dashed border-stone-200 p-3 text-left transition-all hover:border-gold/50 hover:bg-gold-soft"
              >
                <p className="text-sm font-medium text-gray-600">Mensagem personalizada</p>
                <p className="text-xs text-gray-400 mt-0.5">Escreva sua própria mensagem</p>
              </button>
            </div>
            <button onClick={() => setStep(1)} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
              <ChevronLeft className="h-3 w-3" /> Voltar
            </button>
          </div>
        )}

        {/* Step 3: Fill variables or custom message */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">
              {selectedTemplate ? "Preencher variáveis" : "Escrever mensagem"}
            </h2>

            {selectedTemplate && templateVars.length > 0 && (
              <div className="space-y-3">
                {templateVars.map((v) => (
                  <div key={v}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {"{{"}{v}{"}}"}
                    </label>
                    <input
                      type="text"
                      value={variables[v] ?? ""}
                      onChange={(e) => setVariables((prev) => ({ ...prev, [v]: e.target.value }))}
                      className="w-full rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2.5 text-sm outline-none transition focus:border-gold/70 focus:bg-white focus:ring-4 focus:ring-gold/10"
                      placeholder={`Valor para {{${v}}}`}
                    />
                  </div>
                ))}
              </div>
            )}

            {!selectedTemplate && (
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={5}
                className="w-full resize-none rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2.5 text-sm outline-none transition focus:border-gold/70 focus:bg-white focus:ring-4 focus:ring-gold/10"
                placeholder="Digite sua mensagem..."
              />
            )}

            <div className="flex gap-2">
              <button onClick={() => setStep(2)} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                <ChevronLeft className="h-3 w-3" /> Voltar
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={!messageBody}
                className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-gold text-white text-xs rounded-md hover:bg-gold-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Preview <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Preview and send */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Confirmar envio</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-1">Para: {selectedCliente?.nome}</p>
              <p className="text-xs text-gray-400 mb-3">
                Tel: {selectedCliente?.telefone ? formatPhone(selectedCliente.telefone) : "—"}
              </p>
              <div className="bg-white rounded-lg p-3 border border-gray-100">
                <div className="flex items-center gap-1.5 mb-2">
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                  <span className="text-[10px] text-gray-400">WhatsApp</span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{messageBody}</p>
              </div>
            </div>
            <p className="text-[10px] text-gray-400">
              ⚠️ Ao confirmar, o WhatsApp será aberto com esta mensagem. O registro ficará como &quot;Conversa iniciada&quot; — não há confirmação automática de entrega.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setStep(3)} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                <ChevronLeft className="h-3 w-3" /> Voltar
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !selectedCliente?.telefone || !messageBody}
                className="ml-auto inline-flex h-10 items-center gap-2 rounded-xl bg-[#17191a] px-4 text-xs font-bold text-white transition hover:bg-[#303334] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {sending ? "Enviando..." : "Abrir WhatsApp"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
