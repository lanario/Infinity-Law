"use client";

import { startTransition, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, BriefcaseBusiness, Building2, LoaderCircle, MapPin, Save, UserRound } from "lucide-react";
import { salvarCliente } from "@/app/actions/clientes";
import { formatDocument, formatPhone } from "@/lib/utils";
import type { Cliente } from "@/types/domain";
import { cn } from "@/lib/utils";

type ClienteFormState = {
  tipo: "pf" | "pj";
  nome: string;
  cpf_cnpj: string;
  email: string;
  telefone: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  observacoes: string;
  ativo: boolean;
};

type ProcessoRelacionado = {
  id: string;
  numero_cnj: string | null;
  tipo_acao: string | null;
  status: string;
  papel: string;
};

type CepLookupState = "idle" | "loading" | "success" | "not-found" | "error";

type CepResponse = {
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
};

const EMPTY_CLIENTE: ClienteFormState = {
  tipo: "pf",
  nome: "",
  cpf_cnpj: "",
  email: "",
  telefone: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  observacoes: "",
  ativo: true,
};

function toFormState(cliente?: Cliente | null): ClienteFormState {
  if (!cliente) return EMPTY_CLIENTE;
  return {
    tipo: cliente.tipo === "pj" ? "pj" : "pf",
    nome: cliente.nome,
    cpf_cnpj: cliente.cpf_cnpj ?? "",
    email: cliente.email ?? "",
    telefone: cliente.telefone ?? "",
    cep: cliente.cep ?? "",
    logradouro: cliente.logradouro ?? "",
    numero: cliente.numero ?? "",
    complemento: cliente.complemento ?? "",
    bairro: cliente.bairro ?? "",
    cidade: cliente.cidade ?? "",
    estado: cliente.estado ?? "",
    observacoes: cliente.observacoes ?? "",
    ativo: cliente.ativo,
  };
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  maxLength,
  required = false,
  attention,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  maxLength?: number;
  required?: boolean;
  attention?: { badge: string; hint?: string };
}) {
  const hintId = attention?.hint ? `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-hint` : undefined;

  return (
    <label className="block min-w-0 text-xs font-semibold text-stone-600">
      <span className="flex min-h-4 items-center justify-between gap-2">
        <span>{label}{required && <span className="ml-1 text-gold-dark">*</span>}</span>
        {attention && <span className="shrink-0 rounded-full border border-gold/25 bg-gold-soft px-2 py-0.5 text-[9px] font-bold text-gold-dark">{attention.badge}</span>}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-describedby={hintId}
        className={cn(
          "mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium text-stone-800 outline-none transition placeholder:font-normal placeholder:text-stone-400 focus:bg-white focus:ring-4 focus:ring-gold/10",
          attention ? "border-gold/50 bg-gold-soft/25 focus:border-gold/70" : "border-stone-200 bg-stone-50/60 focus:border-gold/70",
        )}
      />
      {attention?.hint && <span id={hintId} className="mt-1 block text-[10px] font-medium leading-relaxed text-gold-dark/80">{attention.hint}</span>}
    </label>
  );
}

export function ClienteForm({
  cliente,
  processos = [],
  canEdit = true,
  layout = "page",
  onCancel,
  onSaved,
}: {
  cliente?: Cliente | null;
  processos?: ProcessoRelacionado[];
  canEdit?: boolean;
  layout?: "page" | "modal";
  onCancel?: () => void;
  onSaved?: (clienteId: string) => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState(() => toFormState(cliente));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [cepLookup, setCepLookup] = useState<CepLookupState>("idle");
  const cepRequest = useRef<AbortController | null>(null);
  const lastQueriedCep = useRef("");
  const isEditing = Boolean(cliente);

  useEffect(() => () => cepRequest.current?.abort(), []);

  function update<K extends keyof ClienteFormState>(key: K, value: ClienteFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateCep(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    const formatted = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    update("cep", formatted);
    setMessage(null);

    if (digits.length < 8) {
      cepRequest.current?.abort();
      cepRequest.current = null;
      lastQueriedCep.current = "";
      setCepLookup("idle");
      return;
    }

    if (lastQueriedCep.current === digits) return;
    lastQueriedCep.current = digits;
    cepRequest.current?.abort();
    const controller = new AbortController();
    cepRequest.current = controller;
    setCepLookup("loading");

    void (async () => {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Falha ao consultar o CEP");
        const address = (await response.json()) as CepResponse;
        if (controller.signal.aborted) return;

        if (address.erro) {
          setCepLookup("not-found");
          return;
        }

        setForm((current) => ({
          ...current,
          logradouro: address.logradouro?.trim() ?? "",
          bairro: address.bairro?.trim() ?? "",
          cidade: address.localidade?.trim() ?? "",
          estado: address.uf?.trim().toUpperCase() ?? "",
        }));
        setCepLookup("success");
      } catch {
        if (controller.signal.aborted) return;
        setCepLookup("error");
      } finally {
        if (cepRequest.current === controller) cepRequest.current = null;
      }
    })();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit || saving) return;

    if (!isEditing && form.cep.replace(/\D/g, "").length !== 8) {
      setMessage({ kind: "error", text: "Informe um CEP válido para cadastrar o cliente." });
      return;
    }
    if (cepRequest.current) {
      setMessage({ kind: "error", text: "Aguarde a busca do endereço pelo CEP terminar." });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const result = await salvarCliente(form, cliente?.id);
      if ("error" in result) {
        setMessage({ kind: "error", text: result.error });
        return;
      }

      setMessage({ kind: "success", text: "Cadastro salvo com sucesso." });
      if (onSaved) onSaved(result.clienteId);
      else if (!isEditing) router.push(`/clientes/${result.clienteId}`);
      else startTransition(() => router.refresh());
    } catch {
      setMessage({ kind: "error", text: "Não foi possível salvar agora. Tente novamente." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={cn("mx-auto space-y-5", layout === "modal" ? "max-w-none" : "max-w-6xl")}>
      {layout === "page" && <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/clientes" className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 transition hover:text-gold-dark">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Voltar para clientes
          </Link>
          <h2 className="mt-2 text-xl font-black tracking-tight text-[#17191a]">
            {isEditing ? cliente?.nome : "Cadastrar cliente"}
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            {isEditing ? "Mantenha os dados e vínculos do cliente atualizados." : "Centralize os dados de contato e identificação do cliente."}
          </p>
        </div>
        {isEditing && (
          <span className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-bold",
            form.ativo ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-stone-200 bg-stone-100 text-stone-500"
          )}>
            {form.ativo ? "Cadastro ativo" : "Cadastro arquivado"}
          </span>
        )}
      </div>}

      <div className={cn("grid gap-5", (layout === "page" || cliente) && "xl:grid-cols-[minmax(0,1fr)_310px]")}>
        <form onSubmit={submit} className="space-y-5">
          <fieldset disabled={!canEdit || saving} className="m-0 min-w-0 space-y-5 border-0 p-0">
          <section className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-[0_8px_24px_-20px_rgba(23,25,26,0.4)] sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-soft text-gold-dark">
                {form.tipo === "pf" ? <UserRound className="h-5 w-5" aria-hidden="true" /> : <Building2 className="h-5 w-5" aria-hidden="true" />}
              </span>
              <div>
                <h3 className="text-sm font-black text-[#17191a]">Identificação</h3>
                <p className="mt-0.5 text-xs text-stone-400">Dados principais e documento</p>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-stone-100/80 p-1">
              {(["pf", "pj"] as const).map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => update("tipo", tipo)}
                  disabled={!canEdit || saving}
                  aria-pressed={form.tipo === tipo}
                  className={cn(
                    "flex h-10 items-center justify-center gap-2 rounded-lg border text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40",
                    form.tipo === tipo ? "gold-sheen border-gold/60 bg-gold text-[#17191a] shadow-sm" : "border-transparent text-stone-500 hover:text-stone-800",
                    !canEdit && "cursor-not-allowed opacity-60"
                  )}
                >
                  {tipo === "pf" ? <UserRound className="h-4 w-4" aria-hidden="true" /> : <Building2 className="h-4 w-4" aria-hidden="true" />}
                  {tipo === "pf" ? "Pessoa física" : "Pessoa jurídica"}
                </button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label={form.tipo === "pf" ? "Nome completo" : "Razão social"} value={form.nome} onChange={(value) => update("nome", value)} placeholder="Nome do cliente" required />
              </div>
              <Field label={form.tipo === "pf" ? "CPF" : "CNPJ"} value={form.cpf_cnpj} onChange={(value) => update("cpf_cnpj", value)} placeholder={form.tipo === "pf" ? "000.000.000-00" : "00.000.000/0000-00"} />
              <Field label="E-mail" value={form.email} onChange={(value) => update("email", value)} type="email" placeholder="cliente@exemplo.com.br" />
              <Field label="Telefone / WhatsApp" value={form.telefone} onChange={(value) => update("telefone", value)} type="tel" placeholder="(11) 99999-9999" />
            </div>
          </section>

          <section className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-[0_8px_24px_-20px_rgba(23,25,26,0.4)] sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-600"><MapPin className="h-5 w-5" aria-hidden="true" /></span>
              <div>
                <h3 className="text-sm font-black text-[#17191a]">Endereço</h3>
                <p className="mt-0.5 text-xs text-stone-400">Informe o CEP primeiro; número e complemento são preenchidos manualmente.</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-6">
              <label className="block min-w-0 text-xs font-semibold text-stone-600 sm:col-span-6">
                CEP{!isEditing && <span className="ml-1 text-gold-dark">*</span>}
                <span className="relative mt-1.5 block">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    value={form.cep}
                    onChange={(event) => updateCep(event.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                    required={!isEditing}
                    aria-describedby="cliente-cep-status"
                    aria-busy={cepLookup === "loading"}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/60 px-3.5 py-2.5 pr-10 text-sm font-medium text-stone-800 outline-none transition placeholder:font-normal placeholder:text-stone-400 focus:border-gold/70 focus:bg-white focus:ring-4 focus:ring-gold/10"
                  />
                  {cepLookup === "loading" && <LoaderCircle aria-hidden="true" className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gold-dark" />}
                  {cepLookup === "success" && <span aria-hidden="true" className="absolute right-3.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-emerald-500" />}
                </span>
                <span
                  id="cliente-cep-status"
                  role="status"
                  aria-live="polite"
                  className={cn(
                    "mt-1.5 block min-h-4 text-[10px] font-medium",
                    cepLookup === "success" ? "text-emerald-700" : cepLookup === "not-found" || cepLookup === "error" ? "text-amber-700" : "text-stone-400",
                  )}
                >
                  {cepLookup === "loading" && "Buscando endereço..."}
                  {cepLookup === "success" && "Endereço localizado. Complete os campos destacados e confira os dados."}
                  {cepLookup === "not-found" && "CEP não encontrado. Confira os números ou preencha o endereço manualmente."}
                  {cepLookup === "error" && "Não foi possível consultar agora. Você pode preencher o endereço manualmente."}
                  {cepLookup === "idle" && (form.cep.replace(/\D/g, "").length === 8 ? "Altere o CEP para consultar e preencher o endereço novamente." : "Digite os 8 dígitos para localizar o endereço automaticamente.")}
                </span>
              </label>
              <div className="sm:col-span-4"><Field label="Logradouro" value={form.logradouro} onChange={(value) => update("logradouro", value)} placeholder="Rua, avenida..." attention={cepLookup === "success" && !form.logradouro.trim() ? { badge: "Não localizado", hint: "O CEP não retornou este dado; complete manualmente." } : undefined} /></div>
              <div className="sm:col-span-2"><Field label="Número" value={form.numero} onChange={(value) => update("numero", value)} placeholder="Nº" attention={cepLookup === "success" ? { badge: form.numero.trim() ? "Manual" : "Falta informar", hint: form.numero.trim() ? "Este campo não é preenchido pelo CEP." : "Informe o número do endereço ou S/N." } : undefined} /></div>
              <div className="sm:col-span-3"><Field label="Complemento" value={form.complemento} onChange={(value) => update("complemento", value)} placeholder="Sala, conjunto..." attention={cepLookup === "success" ? { badge: form.complemento.trim() ? "Manual" : "Opcional", hint: form.complemento.trim() ? "Este campo não é preenchido pelo CEP." : "Sala, bloco ou apartamento, se houver." } : undefined} /></div>
              <div className="sm:col-span-3"><Field label="Bairro" value={form.bairro} onChange={(value) => update("bairro", value)} placeholder="Bairro" attention={cepLookup === "success" && !form.bairro.trim() ? { badge: "Não localizado", hint: "O CEP não retornou este dado; complete manualmente." } : undefined} /></div>
              <div className="sm:col-span-4"><Field label="Cidade" value={form.cidade} onChange={(value) => update("cidade", value)} placeholder="Cidade" attention={cepLookup === "success" && !form.cidade.trim() ? { badge: "Não localizado", hint: "O CEP não retornou este dado; complete manualmente." } : undefined} /></div>
              <div className="sm:col-span-2"><Field label="UF" value={form.estado} onChange={(value) => update("estado", value.toUpperCase())} placeholder="SP" maxLength={2} attention={cepLookup === "success" && !form.estado.trim() ? { badge: "Não localizado", hint: "O CEP não retornou este dado; complete manualmente." } : undefined} /></div>
            </div>
          </section>

          <section className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-[0_8px_24px_-20px_rgba(23,25,26,0.4)] sm:p-6">
            <label className="block text-xs font-semibold text-stone-600">
              Observações internas
              <textarea
                value={form.observacoes}
                onChange={(event) => update("observacoes", event.target.value)}
                rows={4}
                placeholder="Informações úteis para o atendimento e acompanhamento..."
                className="mt-1.5 w-full resize-y rounded-xl border border-stone-200 bg-stone-50/60 px-3.5 py-3 text-sm font-medium text-stone-800 outline-none transition placeholder:font-normal placeholder:text-stone-400 focus:border-gold/70 focus:bg-white focus:ring-4 focus:ring-gold/10"
              />
            </label>
            {isEditing && (
              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-stone-100 bg-stone-50/70 p-3.5">
                <input type="checkbox" checked={form.ativo} onChange={(event) => update("ativo", event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#D4AF37]" />
                <span><span className="block text-xs font-bold text-stone-700">Cliente ativo</span><span className="mt-0.5 block text-[11px] text-stone-400">Desmarque para arquivar sem excluir o histórico ou os vínculos.</span></span>
              </label>
            )}
          </section>

          <AnimatePresence mode="wait">
            {message && (
              <motion.p key={message.text} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="status" className={cn("rounded-xl border px-4 py-3 text-sm", message.kind === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>
                {message.text}
              </motion.p>
            )}
          </AnimatePresence>

          {!canEdit && <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">Seu perfil pode consultar clientes, mas não pode editar este cadastro.</p>}
          <div className={cn(
            "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
            layout === "modal" && "sticky bottom-0 z-10 -mx-4 -mb-4 border-t border-stone-200/80 bg-[#fcfcfb]/95 px-4 pb-1 pt-4 backdrop-blur-md sm:-mx-6 sm:-mb-6 sm:px-6"
          )}>
            {layout === "modal" ? (
              <button type="button" onClick={onCancel} className="inline-flex h-11 items-center justify-center rounded-xl border border-stone-200 bg-white px-5 text-sm font-bold text-stone-600 transition hover:bg-stone-50">Cancelar</button>
            ) : (
              <Link href="/clientes" className="inline-flex h-11 items-center justify-center rounded-xl border border-stone-200 bg-white px-5 text-sm font-bold text-stone-600 transition hover:bg-stone-50">Cancelar</Link>
            )}
            {canEdit && (
              <button type="submit" disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gold px-5 text-sm font-bold text-white shadow-sm transition hover:bg-gold-hover disabled:cursor-not-allowed disabled:opacity-60">
                {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                {saving ? "Salvando..." : isEditing ? "Salvar alterações" : "Salvar cliente"}
              </button>
            )}
          </div>
          </fieldset>
        </form>

        {(layout === "page" || cliente) && <aside className="space-y-4">
          <div className="rounded-2xl border border-stone-200/80 bg-[#17191a] p-5 text-white shadow-[0_12px_32px_-24px_rgba(23,25,26,0.8)]">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gold">Resumo do cadastro</p>
            <p className="mt-3 text-lg font-black leading-tight">{form.nome || "Novo cliente"}</p>
            <p className="mt-1 text-xs text-white/55">{form.tipo === "pf" ? "Pessoa física" : "Pessoa jurídica"}</p>
            <div className="mt-5 space-y-3 border-t border-white/10 pt-4 text-xs">
              <div><p className="text-white/40">Documento</p><p className="mt-1 text-white/85">{form.cpf_cnpj ? formatDocument(form.cpf_cnpj, form.tipo) : "Não informado"}</p></div>
              <div><p className="text-white/40">Contato</p><p className="mt-1 text-white/85">{form.telefone ? formatPhone(form.telefone) : form.email || "Não informado"}</p></div>
              {cliente && <div><p className="text-white/40">Vínculos</p><p className="mt-1 text-white/85">{processos.length} processo{processos.length === 1 ? "" : "s"}</p></div>}
            </div>
          </div>

          {cliente && (
            <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_8px_24px_-20px_rgba(23,25,26,0.4)]">
              <div className="flex items-center justify-between gap-2 px-1 pb-3">
                <div><h3 className="text-xs font-black text-[#17191a]">Processos vinculados</h3><p className="mt-0.5 text-[10px] text-stone-400">Acesso rápido aos casos</p></div>
                <span className="rounded-full bg-gold-soft px-2 py-1 text-[10px] font-bold text-gold-dark">{processos.length}</span>
              </div>
              {processos.length ? (
                <div className="space-y-2">
                  {processos.map((processo) => (
                    <Link key={processo.id} href={`/processos/${processo.id}`} className="block rounded-xl border border-stone-100 px-3 py-2.5 transition hover:border-gold/40 hover:bg-gold-soft/35">
                      <p className="truncate font-mono text-[10px] font-bold text-stone-700">{processo.numero_cnj || processo.tipo_acao || "Processo em preparação"}</p>
                      <p className="mt-1 truncate text-[10px] text-stone-400">{processo.papel} · {processo.status}</p>
                    </Link>
                  ))}
                </div>
              ) : <p className="rounded-xl bg-stone-50 px-3 py-5 text-center text-[11px] text-stone-400">Ainda sem processos vinculados</p>}
              <Link href="/processos/novo" className="mt-3 flex h-9 items-center justify-center gap-1.5 rounded-xl border border-gold/30 text-xs font-bold text-gold-dark transition hover:bg-gold-soft"><BriefcaseBusiness className="h-3.5 w-3.5" aria-hidden="true" /> Criar processo</Link>
            </div>
          )}
        </aside>}
      </div>
    </div>
  );
}
