"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  Circle,
  FileText,
  Loader2,
  Search,
  UserRound,
} from "lucide-react";
import { validateCNJ } from "@/lib/cnj/cnj-validator";
import { dataJudConsultationGuidance } from "@/lib/cnj/datajud-error.mjs";
import { applyDataJudAutofill, DATAJUD_FIELD_LABELS } from "@/lib/cnj/datajud-autofill.mjs";
import { salvarProcesso } from "@/app/actions/processos";
import { formatCNJ } from "@/lib/utils";
import {
  createNovoProcessoFormDefaults,
  getNovoProcessoFormValidationIssue,
  isNovoProcessoFormDirty,
  toggleNovoProcessoAccordionSection,
} from "@/lib/processos/novo-processo-form-state.mjs";
import { DatePicker } from "@/components/ui/date-picker";

interface Area {
  id: number;
  nome: string;
}

interface ClienteOption {
  id: string;
  nome: string;
  tipo: string;
}

interface ResponsavelOption {
  id: string;
  nome: string;
}

interface NovoProcessoFormState {
  partes: Array<{ clienteId: string; papel: "autor" | "reu" | "terceiro" }>;
  responsavelId: string;
  grupoAcao: string;
  tipoAcao: string;
  fase: string;
  etapa: string;
  status: string;
  areaDireitoId: string;
  numeroProtocolo: string;
  processoOriginario: string;
  pastaCaso: string;
  dataRequerimento: string;
  valorCausa: string;
  valorHonorarios: string;
  percentualHonorarios: string;
  contingenciamento: string;
  observacoes: string;
  tribunal: string;
  vara: string;
  uf: string;
  classeProcessual: string;
  dataDistribuicao: string;
  comarca: string;
  assunto: string;
  grau: string;
  sistema: string;
  parteContraria: string;
  advogadoParteContraria: string;
  assuntoCodigo: string;
  classeCodigo: string;
  codigoMunicipioIbge: string;
  datajudAtualizadoEm: string;
}

interface DataJudResultado {
  numeroCNJ: string;
  tribunal: string;
  classe: string;
  assunto: string;
  orgaoJulgador: string;
  uf: string;
  partes: Array<{ nome: string; tipo: string }>;
  movimentacoes: Array<{ data: string; descricao: string; codigo?: string; data_hora?: string | null; complementos?: Array<{ nome: string; descricao?: string }> | null }>;
  dataAjuizamento?: string;
  grau?: string;
  sistema?: string;
  nivelSigilo?: number;
}

const GROUP_OPTIONS = [
  { value: "contencioso", label: "Contencioso" },
  { value: "consultivo", label: "Consultivo" },
  { value: "administrativo", label: "Administrativo" },
  { value: "extrajudicial", label: "Extrajudicial" },
];

const ACTION_TYPES: Record<string, string[]> = {
  contencioso: ["Ação", "Defesa", "Recurso", "Execução", "Cumprimento de sentença"],
  consultivo: ["Consultoria jurídica", "Parecer", "Análise contratual", "Auditoria jurídica"],
  administrativo: ["Requerimento administrativo", "Defesa administrativa", "Recurso administrativo"],
  extrajudicial: ["Negociação", "Notificação extrajudicial", "Acordo", "Mediação"],
};

const PHASE_OPTIONS = [
  { value: "negociacao", label: "Negociação" },
  { value: "extrajudicial", label: "Extrajudicial" },
  { value: "conhecimento", label: "Conhecimento" },
  { value: "recursal", label: "Recursal" },
  { value: "execucao", label: "Execução" },
  { value: "cumprimento_sentenca", label: "Cumprimento de sentença" },
  { value: "liquidacao", label: "Liquidação" },
  { value: "arquivado", label: "Arquivado" },
];

const STAGE_OPTIONS = [
  { value: "analise_do_caso", label: "Análise do caso" },
  { value: "reuniao_com_cliente", label: "Reunião com cliente" },
  { value: "aguardando_documentos", label: "Aguardando documentos" },
  { value: "elaboracao_do_pedido", label: "Elaboração do pedido" },
  { value: "protocolo", label: "Protocolo" },
  { value: "aguardando_distribuicao", label: "Aguardando distribuição" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "audiencia", label: "Audiência" },
  { value: "aguardando_decisao", label: "Aguardando decisão" },
  { value: "recurso", label: "Recurso" },
  { value: "cumprimento", label: "Cumprimento" },
  { value: "finalizacao", label: "Finalização" },
];

const STATUS_OPTIONS = [
  { value: "ativo", label: "Ativo" },
  { value: "suspenso", label: "Suspenso" },
  { value: "arquivado", label: "Arquivado" },
  { value: "encerrado", label: "Encerrado" },
];

const inputClass =
  "mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-[#242627] shadow-sm outline-none transition duration-200 placeholder:text-stone-400 hover:border-stone-300 focus:border-gold focus:ring-4 focus:ring-gold/10 disabled:cursor-not-allowed disabled:bg-stone-50";
const selectClass = `${inputClass} appearance-none`;
const labelClass = "block text-xs font-bold tracking-wide text-stone-600";
type ProcessFormSectionId = "partes" | "classificacao" | "identificacao" | "financeiro" | "anotacoes";
interface FormValidationFocusRequest {
  sectionId: ProcessFormSectionId;
  target: HTMLElement;
  requestId: number;
}

function ViaDataJud({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="ml-1.5 inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 align-middle text-[10px] font-semibold text-emerald-700">
      via DataJud
    </span>
  );
}

function FormSection({
  id,
  title,
  description,
  icon,
  expanded,
  onToggle,
  children,
}: {
  id: ProcessFormSectionId;
  title: string;
  description: string;
  icon: ReactNode;
  expanded: boolean;
  onToggle: (id: ProcessFormSectionId) => void;
  children: ReactNode;
}) {
  const titleId = `novo-processo-${id}-title`;
  const descriptionId = `novo-processo-${id}-description`;
  const triggerId = `novo-processo-${id}-trigger`;
  const panelId = `novo-processo-${id}-panel`;

  return (
    <section className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_12px_36px_-28px_rgba(23,25,26,0.35)]">
      <div className={`px-4 py-3.5 sm:px-6 sm:py-4 ${expanded ? "border-b border-stone-100" : ""}`}>
        <h2 className="min-w-0">
          <button
            id={triggerId}
            type="button"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={() => onToggle(id)}
            className="group flex w-full items-center gap-3 rounded-xl text-left outline-none transition hover:bg-stone-50 focus-visible:ring-4 focus-visible:ring-gold/25"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-soft text-gold-dark">
              {icon}
            </span>
            <span className="min-w-0 flex-1 py-0.5">
              <span id={titleId} className="block text-sm font-black text-[#242627]">
                {title}
              </span>
              <span id={descriptionId} className="mt-0.5 block text-xs text-stone-500">
                {description}
              </span>
            </span>
            <ChevronDown
              className={`mr-2 h-4 w-4 shrink-0 text-stone-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>
        </h2>
      </div>
      <div
        id={panelId}
        role="region"
        aria-labelledby={titleId}
        data-section-panel={id}
        hidden={!expanded}
      >
        {children}
      </div>
    </section>
  );
}

export function NovoProcessoForm({
  areas,
  clientes,
  responsaveis,
  currentUserId,
  onDirtyChange,
  onSavingChange,
  onCancel,
}: {
  areas: Area[];
  clientes: ClienteOption[];
  responsaveis: ResponsavelOption[];
  currentUserId: string | null;
  onDirtyChange: (dirty: boolean) => void;
  onSavingChange: (saving: boolean) => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [numeroCNJ, setNumeroCNJ] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [resultado, setResultado] = useState<DataJudResultado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<ProcessFormSectionId | null>("partes");
  const [focusRequest, setFocusRequest] = useState<FormValidationFocusRequest | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const erroRef = useRef<HTMLDivElement>(null);
  const focusRequestSequence = useRef(0);
  const skipErrorScrollRequest = useRef<number | null>(null);
  const initialForm = useMemo<NovoProcessoFormState>(() => ({
    ...createNovoProcessoFormDefaults(currentUserId),
    partes: [],
    responsavelId: currentUserId ?? "",
  }), [currentUserId]);
  const [form, setForm] = useState<NovoProcessoFormState>(() => initialForm);
  // Campo -> valor que o DataJud preencheu (o selo "via DataJud" some quando o usuário edita).
  const [autoFilled, setAutoFilled] = useState<Record<string, string>>({});
  const [sigiloAviso, setSigiloAviso] = useState(false);
  const latest = useRef({ form, autoFilled });
  latest.current = { form, autoFilled };
  const viaDataJud = (key: keyof NovoProcessoFormState) => autoFilled[key] !== undefined && autoFilled[key] === form[key];

  const { valid } = validateCNJ(numeroCNJ);
  const actionTypes = ACTION_TYPES[form.grupoAcao] ?? [];
  const isDirty = isNovoProcessoFormDirty(form, initialForm, numeroCNJ, resultado);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    if (!erro) return;
    if (focusRequest && skipErrorScrollRequest.current === focusRequest.requestId) return;
    if (skipErrorScrollRequest.current !== null) {
      skipErrorScrollRequest.current = null;
      return;
    }
    erroRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [erro, focusRequest]);

  useEffect(() => {
    if (!focusRequest || openSection !== focusRequest.sectionId) return;

    const requestId = focusRequest.requestId;
    const frame = window.requestAnimationFrame(() => {
      if (focusRequest.target.isConnected) {
        focusRequest.target.focus({ preventScroll: true });
        focusRequest.target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      setFocusRequest((current) => current?.requestId === requestId ? null : current);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [focusRequest, openSection]);

  function toggleSection(sectionId: ProcessFormSectionId) {
    setFocusRequest(null);
    setOpenSection((current) => toggleNovoProcessoAccordionSection(current, sectionId));
  }

  function showValidationError(
    message: string,
    sectionId: ProcessFormSectionId,
    target?: HTMLElement,
  ) {
    setErro(message);
    setOpenSection(sectionId);

    if (target) {
      const requestId = ++focusRequestSequence.current;
      skipErrorScrollRequest.current = requestId;
      setFocusRequest({ sectionId, target, requestId });
    }
  }

  async function buscarCNJ() {
    if (!valid) return;
    setErro(null);
    setResultado(null);
    setSigiloAviso(false);
    setBuscando(true);
    try {
      const res = await fetch("/api/cnj/consulta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numeroCNJ }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(dataJudConsultationGuidance(res.status, data.error) ?? data.error ?? "Erro ao consultar CNJ");
        return;
      }
      const applied = applyDataJudAutofill(latest.current.form, latest.current.autoFilled, data.resultado);
      setForm(applied.form as NovoProcessoFormState);
      setAutoFilled(applied.filled);
      if (applied.sigilo) {
        setSigiloAviso(true);
        return;
      }
      setResultado(data.resultado);
    } catch {
      setErro("Falha de conexão ao consultar CNJ");
    } finally {
      setBuscando(false);
    }
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);

    const issue = getNovoProcessoFormValidationIssue(form, numeroCNJ, valid);
    if (issue) {
      const target = issue.targetId
        ? formRef.current?.querySelector<HTMLElement>(`#${issue.targetId}`) ?? undefined
        : issue.targetSelector
          ? formRef.current?.querySelector<HTMLElement>(issue.targetSelector) ?? undefined
          : undefined;
      showValidationError(issue.message, issue.sectionId, target);
      return;
    }

    const invalidControl = Array.from(
      formRef.current?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        "input, select, textarea",
      ) ?? [],
    ).find((control) => control.willValidate && !control.validity.valid);

    if (invalidControl) {
      const sectionId = invalidControl.closest<HTMLElement>("[data-section-panel]")
        ?.dataset.sectionPanel as ProcessFormSectionId | undefined;
      if (sectionId) {
        showValidationError(
          invalidControl.validationMessage || "Confira este campo antes de continuar.",
          sectionId,
          invalidControl,
        );
      }
      if (!sectionId) setErro(invalidControl.validationMessage || "Confira os campos do formulário antes de continuar.");
      return;
    }

    const valorCausa = form.valorCausa ? Number(form.valorCausa) : null;
    const valorHonorarios = form.valorHonorarios ? Number(form.valorHonorarios) : null;
    const percentualHonorarios = form.percentualHonorarios
      ? Number(form.percentualHonorarios)
      : null;

    setSalvando(true);
    onSavingChange(true);
    let navegando = false;
    try {
      const response = await salvarProcesso({
        numero_cnj: valid ? resultado?.numeroCNJ ?? numeroCNJ : null,
        numero_cnj_raw: numeroCNJ ? numeroCNJ.replace(/\D/g, "") : null,
        advogado_id: form.responsavelId || null,
        grupo_acao: form.grupoAcao,
        tipo_acao: form.tipoAcao,
        fase: form.fase,
        etapa: form.etapa,
        status: form.status,
        area_direito_id: form.areaDireitoId ? Number(form.areaDireitoId) : null,
        numero_protocolo: form.numeroProtocolo || null,
        processo_originario: form.processoOriginario || null,
        pasta_caso: form.pastaCaso || null,
        data_requerimento: form.dataRequerimento || null,
        valor_causa: valorCausa,
        valor_honorarios: valorHonorarios,
        percentual_honorarios: percentualHonorarios,
        contingenciamento: form.contingenciamento,
        tribunal: form.tribunal.trim() || null,
        vara: form.vara.trim() || null,
        comarca: form.comarca.trim() || null,
        assunto: form.assunto.trim() || null,
        assunto_codigo: form.assuntoCodigo || null,
        classe_codigo: form.classeCodigo || null,
        grau: form.grau.trim() || null,
        sistema: form.sistema.trim() || null,
        nivel_sigilo: resultado?.nivelSigilo ?? 0,
        datajud_atualizado_em: form.datajudAtualizadoEm || null,
        codigo_municipio_ibge: form.codigoMunicipioIbge || null,
        parte_contraria: form.parteContraria.trim() || null,
        advogado_parte_contraria: form.advogadoParteContraria.trim() || null,
        uf: form.uf.trim().toUpperCase() || null,
        classe_processual: form.classeProcessual.trim() || null,
        data_distribuicao: form.dataDistribuicao || null,
        observacoes: form.observacoes || null,
        consulta_cnj: Boolean(resultado),
        movimentacoes: resultado?.movimentacoes ?? [],
        clientes: form.partes.map((parte) => ({ cliente_id: parte.clienteId, papel: parte.papel })),
      });

      if ("error" in response) {
        setErro(response.error);
        return;
      }
      // Mantém o estado "salvando" até a navegação concluir (evita novo envio).
      navegando = true;
      router.push(`/processos/${response.processoId}?criado=1`);
      router.refresh();
    } catch {
      setErro("Não foi possível salvar o processo. Tente novamente.");
    } finally {
      if (!navegando) {
        setSalvando(false);
        onSavingChange(false);
      }
    }
  }

  return (
    <motion.form
      ref={formRef}
      onSubmit={salvar}
      noValidate
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      aria-busy={salvando}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="space-y-5 p-4 sm:p-6">
      <FormSection
        id="partes"
        title="Partes e responsabilidade"
        description="Defina o cliente e a pessoa responsável pelo caso."
        icon={<UserRound className="h-4 w-4" aria-hidden="true" />}
        expanded={openSection === "partes"}
        onToggle={toggleSection}
      >
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <fieldset className="sm:col-span-2">
            <legend className={labelClass}>Partes envolvidas <span className="text-gold-dark">*</span></legend>
            <p className="mt-1 text-[11px] font-normal text-stone-400">Selecione um ou mais clientes e indique o polo de cada um.</p>
            {clientes.length === 0 ? (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs font-medium text-amber-800">
                Cadastre um cliente antes de abrir um processo.
              </p>
            ) : (
              <div className="mt-2 max-h-64 space-y-2 overflow-y-auto rounded-xl border border-stone-200 bg-stone-50/60 p-2.5">
                {clientes.map((cliente) => {
                  const parte = form.partes.find((item) => item.clienteId === cliente.id);
                  return (
                    <div key={cliente.id} className="flex flex-col gap-2 rounded-lg bg-white p-2.5 shadow-sm sm:flex-row sm:items-center">
                      <button
                        type="button"
                        aria-pressed={Boolean(parte)}
                        onClick={() => setForm((state) => ({
                          ...state,
                          partes: parte
                            ? state.partes.filter((item) => item.clienteId !== cliente.id)
                            : [...state.partes, { clienteId: cliente.id, papel: "autor" }],
                        }))}
                        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1.5 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-gold"
                      >
                        {parte
                          ? <CheckCircle2 className="h-4 w-4 shrink-0 text-gold-dark" aria-hidden="true" />
                          : <Circle className="h-4 w-4 shrink-0 text-stone-300" aria-hidden="true" />}
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-bold text-stone-700">{cliente.nome}</span>
                          <span className="mt-0.5 block text-[10px] text-stone-400">{cliente.tipo === "pj" ? "Pessoa jurídica" : "Pessoa física"}</span>
                        </span>
                      </button>
                      {parte && (
                        <select
                          value={parte.papel}
                          aria-label={`Polo processual de ${cliente.nome}`}
                          onChange={(event) => setForm((state) => ({
                            ...state,
                            partes: state.partes.map((item) => item.clienteId === cliente.id
                              ? { ...item, papel: event.target.value as "autor" | "reu" | "terceiro" }
                              : item),
                          }))}
                          className="rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-[11px] font-semibold text-stone-600 outline-none focus:border-gold/70 focus:ring-2 focus:ring-gold/10"
                        >
                          <option value="autor">Autor / requerente</option>
                          <option value="reu">Réu / requerido</option>
                          <option value="terceiro">Terceiro interessado</option>
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <p className="mt-1.5 text-[10px] text-stone-400">{form.partes.length} parte{form.partes.length === 1 ? "" : "s"} selecionada{form.partes.length === 1 ? "" : "s"}</p>
          </fieldset>

          <label className={labelClass}>
            Responsável
            <select
              value={form.responsavelId}
              onChange={(event) => setForm((state) => ({ ...state, responsavelId: event.target.value }))}
              className={selectClass}
            >
              <option value="">Sem responsável definido</option>
              {responsaveis.map((responsavel) => (
                <option key={responsavel.id} value={responsavel.id}>{responsavel.nome}</option>
              ))}
            </select>
          </label>

          <label className={labelClass}>
            Parte contrária
            <input
              value={form.parteContraria}
              onChange={(event) => setForm((state) => ({ ...state, parteContraria: event.target.value }))}
              maxLength={200}
              placeholder="Nome da parte contrária"
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Advogado da parte contrária
            <input
              value={form.advogadoParteContraria}
              onChange={(event) => setForm((state) => ({ ...state, advogadoParteContraria: event.target.value }))}
              maxLength={200}
              placeholder="Nome e OAB, se souber"
              className={inputClass}
            />
          </label>
        </div>
      </FormSection>

      <FormSection
        id="classificacao"
        title="Classificação do pedido"
        description="Organize o tipo de trabalho e o momento atual do caso."
        icon={<BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />}
        expanded={openSection === "classificacao"}
        onToggle={toggleSection}
      >
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <label className={labelClass}>
            Grupo de ação <span className="text-gold-dark">*</span><ViaDataJud show={viaDataJud("grupoAcao")} />
            <select
              required
              value={form.grupoAcao}
              onChange={(event) => setForm((state) => ({ ...state, grupoAcao: event.target.value, tipoAcao: "" }))}
              className={selectClass}
            >
              <option value="">Selecione o grupo de ação</option>
              {GROUP_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <AnimatePresence mode="wait" initial={false}>
            <motion.label
              key={form.grupoAcao || "tipo-acao"}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
              className={labelClass}
            >
              Tipo de ação <span className="text-gold-dark">*</span><ViaDataJud show={viaDataJud("tipoAcao")} />
              <select
                required
                disabled={!form.grupoAcao}
                value={form.tipoAcao}
                onChange={(event) => setForm((state) => ({ ...state, tipoAcao: event.target.value }))}
                className={selectClass}
              >
                <option value="">{form.grupoAcao ? "Selecione o tipo de ação" : "Escolha primeiro o grupo"}</option>
                {actionTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </motion.label>
          </AnimatePresence>

          <label className={labelClass}>
            Fase <span className="text-gold-dark">*</span>
            <select
              required
              value={form.fase}
              onChange={(event) => setForm((state) => ({ ...state, fase: event.target.value }))}
              className={selectClass}
            >
              {PHASE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>

          <label className={labelClass}>
            Etapa <span className="text-gold-dark">*</span>
            <select
              required
              value={form.etapa}
              onChange={(event) => setForm((state) => ({ ...state, etapa: event.target.value }))}
              className={selectClass}
            >
              {STAGE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>

          <label className={labelClass}>
            Área do Direito
            <select
              value={form.areaDireitoId}
              onChange={(event) => setForm((state) => ({ ...state, areaDireitoId: event.target.value }))}
              className={selectClass}
            >
              <option value="">Selecione uma área</option>
              {areas.map((area) => <option key={area.id} value={area.id}>{area.nome}</option>)}
            </select>
          </label>

          <label className={labelClass}>
            Status
            <select
              value={form.status}
              onChange={(event) => setForm((state) => ({ ...state, status: event.target.value }))}
              className={selectClass}
            >
              {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
      </FormSection>

      <FormSection
        id="identificacao"
        title="Identificação do processo"
        description="O tribunal atribui o CNJ depois da distribuição. Se o processo ainda não foi distribuído, deixe o número em branco e informe-o depois."
        icon={<FileText className="h-4 w-4" aria-hidden="true" />}
        expanded={openSection === "identificacao"}
        onToggle={toggleSection}
      >
        <div className="space-y-4 p-5 sm:p-6">
          <div>
            <label htmlFor="numero-cnj" className={labelClass}>Número do processo (CNJ)</label>
            <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
              <input
                id="numero-cnj"
                type="text"
                inputMode="numeric"
                value={numeroCNJ}
                onChange={(event) => {
                  const formatted = formatCNJ(event.target.value);
                  setNumeroCNJ(formatted);
                  setResultado(null);
                  setErro(null);
                  setSigiloAviso(false);
                  // Os dados preenchidos pertenciam ao número anterior.
                  if (Object.keys(latest.current.autoFilled).length > 0) {
                    const cleared = applyDataJudAutofill(latest.current.form, latest.current.autoFilled, null);
                    setForm(cleared.form as NovoProcessoFormState);
                    setAutoFilled({});
                  }
                }}
                onKeyDown={(event) => event.key === "Enter" && valid && !buscando && buscarCNJ()}
                placeholder="0000000-00.0000.0.00.0000"
                className={`${inputClass} mt-0 font-mono sm:flex-1`}
                aria-label="Número do processo CNJ"
              />
              <button
                type="button"
                onClick={buscarCNJ}
                disabled={!valid || buscando}
                aria-busy={buscando}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-bold text-stone-600 transition hover:border-gold/50 hover:bg-gold-soft/60 hover:text-gold-dark focus:outline-none focus:ring-4 focus:ring-gold/10 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {buscando ? "Consultando" : "Consultar CNJ"}
              </button>
            </div>
            {numeroCNJ && !valid && (
              <p className="mt-1.5 text-[11px] text-rose-600">Use o formato NNNNNNN-DD.AAAA.J.TT.OOOO ou deixe em branco.</p>
            )}
            <p className="mt-2 text-[11px] leading-5 text-stone-500">
              Encontre o CNJ na capa do processo, na consulta processual ou no comprovante de distribuição do tribunal. Consultar no DataJud é opcional e usa uma configuração do servidor compartilhada por este sistema.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Número do protocolo/requerimento
              <input
                value={form.numeroProtocolo}
                onChange={(event) => setForm((state) => ({ ...state, numeroProtocolo: event.target.value }))}
                placeholder="Ex.: 123456789-0"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Processo originário
              <input
                value={form.processoOriginario}
                onChange={(event) => setForm((state) => ({ ...state, processoOriginario: event.target.value }))}
                placeholder="Número CNJ ou referência"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Pasta/Caso
              <input
                value={form.pastaCaso}
                onChange={(event) => setForm((state) => ({ ...state, pastaCaso: event.target.value }))}
                placeholder="Identificação da pasta"
                className={inputClass}
              />
            </label>
            <DatePicker
              label="Data do requerimento"
              labelClassName={labelClass}
              value={form.dataRequerimento}
              onChange={(dataRequerimento) => setForm((state) => ({ ...state, dataRequerimento }))}
              inputClassName="bg-white text-[#242627] shadow-sm"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Tribunal<ViaDataJud show={viaDataJud("tribunal")} />
              <input
                value={form.tribunal}
                onChange={(event) => setForm((state) => ({ ...state, tribunal: event.target.value }))}
                maxLength={60}
                placeholder="Ex.: TJSP"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Órgão julgador / vara<ViaDataJud show={viaDataJud("vara")} />
              <input
                value={form.vara}
                onChange={(event) => setForm((state) => ({ ...state, vara: event.target.value }))}
                maxLength={160}
                placeholder="Ex.: 1ª Vara Cível"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Classe processual<ViaDataJud show={viaDataJud("classeProcessual")} />
              <input
                value={form.classeProcessual}
                onChange={(event) => setForm((state) => ({ ...state, classeProcessual: event.target.value }))}
                maxLength={160}
                placeholder="Ex.: Procedimento Comum Cível"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              UF<ViaDataJud show={viaDataJud("uf")} />
              <input
                value={form.uf}
                onChange={(event) => setForm((state) => ({ ...state, uf: event.target.value.toUpperCase().replace(/[^A-Z]/g, "") }))}
                maxLength={2}
                placeholder="Ex.: SP"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Comarca
              <input
                value={form.comarca}
                onChange={(event) => setForm((state) => ({ ...state, comarca: event.target.value }))}
                maxLength={160}
                placeholder="Ex.: São Paulo"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Assunto<ViaDataJud show={viaDataJud("assunto")} />
              <input
                value={form.assunto}
                onChange={(event) => setForm((state) => ({ ...state, assunto: event.target.value }))}
                maxLength={300}
                placeholder="Ex.: Indenização por dano moral"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Grau<ViaDataJud show={viaDataJud("grau")} />
              <input
                value={form.grau}
                onChange={(event) => setForm((state) => ({ ...state, grau: event.target.value }))}
                maxLength={40}
                placeholder="Ex.: G1"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Sistema<ViaDataJud show={viaDataJud("sistema")} />
              <input
                value={form.sistema}
                onChange={(event) => setForm((state) => ({ ...state, sistema: event.target.value }))}
                maxLength={80}
                placeholder="Ex.: PJe"
                className={inputClass}
              />
            </label>
            <DatePicker
              label={viaDataJud("dataDistribuicao") ? "Data de distribuição (via DataJud)" : "Data de distribuição"}
              labelClassName={labelClass}
              value={form.dataDistribuicao}
              onChange={(dataDistribuicao) => setForm((state) => ({ ...state, dataDistribuicao }))}
              inputClassName="bg-white text-[#242627] shadow-sm"
            />
          </div>

          <div role="status" aria-live="polite">
            {sigiloAviso && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs font-medium text-amber-800">
                Este processo tem nível de sigilo. Por segurança, os dados do DataJud não foram usados; preencha manualmente.
              </p>
            )}
          </div>

          {resultado && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4"
            >
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-800">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Dados encontrados no DataJud
              </div>
              <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                <p><span className="text-stone-500">Tribunal:</span> <strong>{resultado.tribunal || "—"}</strong></p>
                <p><span className="text-stone-500">Classe processual:</span> <strong>{resultado.classe || "—"}</strong></p>
                <p><span className="text-stone-500">Órgão julgador:</span> <strong>{resultado.orgaoJulgador || "—"}</strong></p>
                <p><span className="text-stone-500">Assunto:</span> <strong>{resultado.assunto || "—"}</strong></p>
                {resultado.grau && <p><span className="text-stone-500">Grau:</span> <strong>{resultado.grau}</strong></p>}
                {resultado.sistema && <p><span className="text-stone-500">Sistema:</span> <strong>{resultado.sistema}</strong></p>}
              </div>
              {Object.keys(autoFilled).length > 0 && (
                <p className="mt-2 border-t border-emerald-200/80 pt-2 text-xs text-stone-600">
                  Preenchido automaticamente (campos vazios): {Object.keys(autoFilled).map((key) => DATAJUD_FIELD_LABELS[key as keyof typeof DATAJUD_FIELD_LABELS]).join(", ")}. Revise antes de cadastrar.
                </p>
              )}
              {resultado.partes.length > 0 && (
                <p className="mt-2 border-t border-emerald-200/80 pt-2 text-xs text-stone-600">
                  {resultado.partes.length} partes identificadas no processo.
                </p>
              )}
            </motion.div>
          )}
        </div>
      </FormSection>

      <FormSection
        id="financeiro"
        title="Valores e honorários"
        description="Os honorários informados também serão registrados no financeiro."
        icon={<span className="text-sm font-black">R$</span>}
        expanded={openSection === "financeiro"}
        onToggle={toggleSection}
      >
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <label className={labelClass}>
            Valor da causa
            <span className="relative block">
              <span className="pointer-events-none absolute left-3.5 top-[calc(50%+3px)] -translate-y-1/2 text-xs font-bold text-stone-400">R$</span>
              <input
                id="valor-causa"
                type="number"
                min="0"
                step="0.01"
                value={form.valorCausa}
                onChange={(event) => setForm((state) => ({ ...state, valorCausa: event.target.value }))}
                placeholder="0,00"
                className={`${inputClass} pl-10`}
              />
            </span>
          </label>
          <label className={labelClass}>
            Valor dos honorários
            <span className="relative block">
              <span className="pointer-events-none absolute left-3.5 top-[calc(50%+3px)] -translate-y-1/2 text-xs font-bold text-stone-400">R$</span>
              <input
                id="valor-honorarios"
                type="number"
                min="0"
                step="0.01"
                value={form.valorHonorarios}
                onChange={(event) => setForm((state) => ({ ...state, valorHonorarios: event.target.value }))}
                placeholder="0,00"
                className={`${inputClass} pl-10`}
              />
            </span>
          </label>
          <label className={labelClass}>
            Percentual de honorários (%)
            <span className="relative block">
              <input
                id="percentual-honorarios"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.percentualHonorarios}
                onChange={(event) => setForm((state) => ({ ...state, percentualHonorarios: event.target.value }))}
                placeholder="Ex.: 20"
                className={`${inputClass} pr-10`}
              />
              <span className="pointer-events-none absolute right-3.5 top-[calc(50%+3px)] -translate-y-1/2 text-xs font-bold text-stone-400">%</span>
            </span>
          </label>
          <label className={labelClass}>
            Contingenciamento
            <select
              value={form.contingenciamento}
              onChange={(event) => setForm((state) => ({ ...state, contingenciamento: event.target.value }))}
              className={selectClass}
            >
              <option value="nao">Não</option>
              <option value="parcial">Parcial</option>
              <option value="integral">Integral</option>
            </select>
          </label>
        </div>
      </FormSection>

      <FormSection
        id="anotacoes"
        title="Anotações gerais"
        description="Registre observações e orientações importantes para este caso."
        icon={<FileText className="h-4 w-4" aria-hidden="true" />}
        expanded={openSection === "anotacoes"}
        onToggle={toggleSection}
      >
        <div className="p-5 sm:p-6">
        <label className={labelClass}>
          Anotações gerais
          <textarea
            value={form.observacoes}
            onChange={(event) => setForm((state) => ({ ...state, observacoes: event.target.value }))}
            rows={4}
            maxLength={5000}
            placeholder="Anotações, fatos, fundamentos e orientações para o caso..."
            className={`${inputClass} resize-y`}
          />
        </label>
        </div>
      </FormSection>

      <AnimatePresence>
        {erro && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            ref={erroRef}
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{erro}</span>
          </motion.div>
        )}
      </AnimatePresence>
        </div>
      </div>

      <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-stone-200 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:flex-row sm:justify-end sm:px-6">
        <button
          type="button"
          onClick={onCancel}
          disabled={salvando}
          className="rounded-xl px-5 py-2.5 text-sm font-bold text-stone-600 transition hover:bg-stone-100 focus:outline-none focus:ring-4 focus:ring-stone-200"
        >
          Cancelar
        </button>
        <motion.button
          type="submit"
          whileTap={{ scale: 0.98 }}
          disabled={salvando || clientes.length === 0}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#17191a] px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-[#292c2d] focus:outline-none focus:ring-4 focus:ring-gold/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <BriefcaseBusiness className="h-4 w-4 text-gold" />}
          {salvando ? "Salvando processo..." : "Cadastrar processo"}
        </motion.button>
      </div>
    </motion.form>
  );
}
