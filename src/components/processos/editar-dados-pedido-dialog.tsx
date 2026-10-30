"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PencilLine, Plus, Trash2, X } from "lucide-react";
import { atualizarDadosPedido } from "@/app/actions/processos";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import type { ProcessoDadosPedidoInput } from "@/lib/validations/processo.schema";

type PapelCliente = "autor" | "reu" | "terceiro";
type GrupoAcao = ProcessoDadosPedidoInput["grupo_acao"];

export interface DadosPedidoInicial {
  clientes: Array<{ id: string; nome: string; papel: PapelCliente }>;
  advogadoResponsavelId: string | null;
  grupoAcao: GrupoAcao | null;
  tipoAcao: string | null;
  classeProcessual: string | null;
  assunto: string | null;
  grau: string | null;
  sistema: string | null;
  comarca: string | null;
  parteContraria: string | null;
  advogadoParteContraria: string | null;
  etapa: string | null;
  numeroProtocolo: string | null;
  processoOriginario: string | null;
  pastaCaso: string | null;
  dataRequerimento: string | null;
  valorCausa: number | null;
  valorHonorarios: number | null;
  percentualHonorarios: number | null;
  contingenciamento: "nao" | "parcial" | "integral" | null;
}

interface ClienteOption {
  id: string;
  nome: string;
  ativo: boolean;
}

interface ResponsavelOption {
  id: string;
  nome: string;
  ativo: boolean;
}

interface FormState {
  clientes: Array<{ clienteId: string; papel: PapelCliente }>;
  advogadoResponsavelId: string;
  grupoAcao: GrupoAcao | "";
  tipoAcao: string;
  classeProcessual: string;
  assunto: string;
  grau: string;
  sistema: string;
  comarca: string;
  parteContraria: string;
  advogadoParteContraria: string;
  etapa: string;
  numeroProtocolo: string;
  processoOriginario: string;
  pastaCaso: string;
  dataRequerimento: string;
  valorCausa: string;
  valorHonorarios: string;
  percentualHonorarios: string;
  contingenciamento: "nao" | "parcial" | "integral";
}

const inputClass = "mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-gold focus:ring-4 focus:ring-gold/15 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:disabled:bg-zinc-800/30";
const labelClass = "block text-xs font-semibold text-stone-600 dark:text-zinc-300";
const selectClass = `${inputClass} pr-8`;
const optionPapeis: Array<{ value: PapelCliente; label: string }> = [
  { value: "autor", label: "Ativo (autor / requerente)" },
  { value: "reu", label: "Passivo (réu / requerido)" },
  { value: "terceiro", label: "Terceiro interessado" },
];

function criarFormulario(dados: DadosPedidoInicial): FormState {
  return {
    clientes: dados.clientes.map(({ id, papel }) => ({ clienteId: id, papel })),
    advogadoResponsavelId: dados.advogadoResponsavelId ?? "",
    grupoAcao: dados.grupoAcao ?? "",
    tipoAcao: dados.tipoAcao ?? "",
    classeProcessual: dados.classeProcessual ?? "",
    assunto: dados.assunto ?? "",
    grau: dados.grau ?? "",
    sistema: dados.sistema ?? "",
    comarca: dados.comarca ?? "",
    parteContraria: dados.parteContraria ?? "",
    advogadoParteContraria: dados.advogadoParteContraria ?? "",
    etapa: dados.etapa ?? "",
    numeroProtocolo: dados.numeroProtocolo ?? "",
    processoOriginario: dados.processoOriginario ?? "",
    pastaCaso: dados.pastaCaso ?? "",
    dataRequerimento: dados.dataRequerimento ?? "",
    valorCausa: dados.valorCausa?.toString() ?? "",
    valorHonorarios: dados.valorHonorarios?.toString() ?? "",
    percentualHonorarios: dados.percentualHonorarios?.toString() ?? "",
    contingenciamento: dados.contingenciamento ?? "nao",
  };
}

function converterNumero(value: string) {
  return value.trim() ? Number(value) : null;
}

function textoOpcional(value: string) {
  return value.trim() ? value.trim() : null;
}

export function EditarDadosPedidoDialog({
  processoId,
  dados,
  clientesDisponiveis,
  responsaveisDisponiveis,
  canReadFinanceiro,
  canWriteFinanceiro,
}: {
  processoId: string;
  dados: DadosPedidoInicial;
  clientesDisponiveis: ClienteOption[];
  responsaveisDisponiveis: ResponsavelOption[];
  canReadFinanceiro: boolean;
  canWriteFinanceiro: boolean;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [form, setForm] = useState(() => criarFormulario(dados));

  const opcoesCliente = useMemo(() => {
    const opcoes = new Map(clientesDisponiveis.map((cliente) => [cliente.id, cliente]));
    for (const cliente of dados.clientes) {
      if (!opcoes.has(cliente.id)) opcoes.set(cliente.id, { ...cliente, ativo: true });
    }
    return [...opcoes.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [clientesDisponiveis, dados.clientes]);

  const opcoesResponsavel = useMemo(() => {
    const opcoes = new Map(responsaveisDisponiveis.map((responsavel) => [responsavel.id, responsavel]));
    return [...opcoes.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [responsaveisDisponiveis]);

  useEffect(() => {
    if (!aberto) {
      setForm(criarFormulario(dados));
      setErro(null);
    }
  }, [aberto, dados]);

  function fechar() {
    if (salvando) return;
    setAberto(false);
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    if (form.clientes.length === 0 || form.clientes.some((cliente) => !cliente.clienteId)) {
      setErro("Selecione ao menos um cliente para o processo.");
      return;
    }
    if (!form.grupoAcao || !form.tipoAcao.trim() || !form.etapa.trim()) {
      setErro("Preencha grupo de ação, tipo de ação e etapa.");
      return;
    }

    const entrada: ProcessoDadosPedidoInput = {
      grupo_acao: form.grupoAcao,
      tipo_acao: form.tipoAcao,
      advogado_id: form.advogadoResponsavelId || null,
      etapa: form.etapa,
      clientes: form.clientes.map((cliente) => ({ cliente_id: cliente.clienteId, papel: cliente.papel })),
      classe_processual: textoOpcional(form.classeProcessual),
      assunto: textoOpcional(form.assunto),
      grau: textoOpcional(form.grau),
      sistema: textoOpcional(form.sistema),
      comarca: textoOpcional(form.comarca),
      parte_contraria: textoOpcional(form.parteContraria),
      advogado_parte_contraria: textoOpcional(form.advogadoParteContraria),
      numero_protocolo: textoOpcional(form.numeroProtocolo),
      processo_originario: textoOpcional(form.processoOriginario),
      pasta_caso: textoOpcional(form.pastaCaso),
      data_requerimento: form.dataRequerimento || null,
      ...(canReadFinanceiro ? { valor_causa: converterNumero(form.valorCausa) } : {}),
      ...(canWriteFinanceiro
        ? {
            valor_honorarios: converterNumero(form.valorHonorarios),
            percentual_honorarios: converterNumero(form.percentualHonorarios),
            contingenciamento: form.contingenciamento,
          }
        : {}),
    };

    setSalvando(true);
    try {
      const resposta = await atualizarDadosPedido(processoId, entrada);
      if ("error" in resposta) {
        setErro(resposta.error);
        return;
      }
      setAberto(false);
      router.refresh();
    } catch {
      setErro("Não foi possível salvar os dados do pedido. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  const labelInput = (id: string, label: string, value: string, onChange: (value: string) => void, props: { maxLength?: number; placeholder?: string; required?: boolean } = {}) => (
    <label htmlFor={id} className={labelClass}>
      {label}
      <input
        id={id}
        required={props.required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={props.maxLength}
        placeholder={props.placeholder}
        className={inputClass}
      />
    </label>
  );

  return (
    <Dialog open={aberto} onOpenChange={(open) => {
      if (salvando && !open) return;
      setAberto(open);
    }}>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-600 transition hover:border-gold/50 hover:bg-gold-soft/40 hover:text-gold-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/20 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-[#D4AF37]/15 dark:hover:text-[#E5C158]"
      >
        <PencilLine className="h-3.5 w-3.5" aria-hidden="true" />
        Editar dados
      </button>
      <DialogContent
        showCloseButton={false}
        className="dashboard-root flex max-h-[92dvh] w-[calc(100%-1rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-2xl border border-stone-200 bg-white p-0 text-stone-800 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <DialogHeader className="shrink-0 border-b border-stone-100 px-5 py-4 pr-14 dark:border-zinc-800 sm:px-6">
          <DialogTitle className="text-base font-bold text-stone-900 dark:text-zinc-100">Editar dados do pedido</DialogTitle>
          <DialogDescription className="mt-1 text-xs text-stone-500 dark:text-zinc-400">
            Atualize as partes, a classificação e os dados jurídicos deste processo.
          </DialogDescription>
          <button
            type="button"
            onClick={fechar}
            disabled={salvando}
            aria-label="Fechar edição dos dados do pedido"
            className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/20 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </DialogHeader>

        <form onSubmit={salvar} aria-busy={salvando} className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-6 px-5 py-5 sm:px-6">
            <fieldset className="space-y-3">
              <legend className="text-sm font-bold text-stone-800 dark:text-zinc-100">Clientes e polo</legend>
              {form.clientes.map((cliente, index) => (
                <div key={`${index}-${cliente.clienteId}`} className="grid gap-3 rounded-xl border border-stone-100 bg-stone-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-800/60 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
                  <label className={labelClass} htmlFor={`pedido-cliente-${index}`}>
                    Cliente
                    <select
                      id={`pedido-cliente-${index}`}
                      required
                      autoFocus={index === 0}
                      value={cliente.clienteId}
                      onChange={(event) => setForm((current) => ({
                        ...current,
                        clientes: current.clientes.map((item, itemIndex) => itemIndex === index ? { ...item, clienteId: event.target.value } : item),
                      }))}
                      className={selectClass}
                    >
                      <option value="">Selecione um cliente</option>
                      {opcoesCliente.map((opcao) => (
                        <option
                          key={opcao.id}
                          value={opcao.id}
                          disabled={form.clientes.some((selecionado, itemIndex) => itemIndex !== index && selecionado.clienteId === opcao.id)}
                        >
                          {opcao.nome}{!opcao.ativo ? " (inativo)" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={labelClass} htmlFor={`pedido-polo-${index}`}>
                    Polo do cliente
                    <select
                      id={`pedido-polo-${index}`}
                      value={cliente.papel}
                      onChange={(event) => setForm((current) => ({
                        ...current,
                        clientes: current.clientes.map((item, itemIndex) => itemIndex === index ? { ...item, papel: event.target.value as PapelCliente } : item),
                      }))}
                      className={selectClass}
                    >
                      {optionPapeis.map((opcao) => <option key={opcao.value} value={opcao.value}>{opcao.label}</option>)}
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={form.clientes.length <= 1}
                    onClick={() => setForm((current) => ({ ...current, clientes: current.clientes.filter((_, itemIndex) => itemIndex !== index) }))}
                    aria-label={`Remover cliente ${opcoesCliente.find((opcao) => opcao.id === cliente.clienteId)?.nome ?? "da lista"}`}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold text-stone-500 hover:bg-white hover:text-rose-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/20 disabled:cursor-not-allowed disabled:opacity-35 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-rose-400"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    <span className="sm:sr-only">Remover</span>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setForm((current) => ({ ...current, clientes: [...current.clientes, { clienteId: "", papel: "autor" }] }))}
                className="inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-gold-dark transition hover:bg-gold-soft/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/20 dark:text-[#E5C158] dark:hover:bg-[#D4AF37]/15"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Adicionar cliente
              </button>
            </fieldset>

            <fieldset className="grid gap-4 border-t border-stone-100 pt-5 dark:border-zinc-800 sm:grid-cols-2">
              <legend className="sr-only">Classificação do pedido</legend>
              <label htmlFor="pedido-grupo" className={labelClass}>
                Grupo de ação
                <select
                  id="pedido-grupo"
                  required
                  value={form.grupoAcao}
                  onChange={(event) => setForm((current) => ({ ...current, grupoAcao: event.target.value as GrupoAcao | "" }))}
                  className={selectClass}
                >
                  <option value="">Selecione</option>
                  <option value="contencioso">Contencioso</option>
                  <option value="consultivo">Consultivo</option>
                  <option value="administrativo">Administrativo</option>
                  <option value="extrajudicial">Extrajudicial</option>
                </select>
              </label>
              {labelInput("pedido-tipo-acao", "Tipo de ação", form.tipoAcao, (value) => setForm((current) => ({ ...current, tipoAcao: value })), { maxLength: 120, placeholder: "Ex.: Ação", required: true })}
              {labelInput("pedido-classe", "Classe processual", form.classeProcessual, (value) => setForm((current) => ({ ...current, classeProcessual: value })))}
              {labelInput("pedido-assunto", "Assunto", form.assunto, (value) => setForm((current) => ({ ...current, assunto: value })), { maxLength: 300 })}
              {labelInput("pedido-grau", "Grau", form.grau, (value) => setForm((current) => ({ ...current, grau: value })), { maxLength: 40 })}
              {labelInput("pedido-sistema", "Sistema", form.sistema, (value) => setForm((current) => ({ ...current, sistema: value })), { maxLength: 80 })}
              {labelInput("pedido-comarca", "Comarca", form.comarca, (value) => setForm((current) => ({ ...current, comarca: value })), { maxLength: 160 })}
              {labelInput("pedido-parte-contraria", "Parte contrária", form.parteContraria, (value) => setForm((current) => ({ ...current, parteContraria: value })), { maxLength: 200 })}
              {labelInput("pedido-advogado-contrario", "Advogado da parte contrária", form.advogadoParteContraria, (value) => setForm((current) => ({ ...current, advogadoParteContraria: value })), { maxLength: 200 })}
              <label htmlFor="pedido-advogado-responsavel" className={labelClass}>
                Advogado responsável
                <select
                  id="pedido-advogado-responsavel"
                  value={form.advogadoResponsavelId}
                  onChange={(event) => setForm((current) => ({ ...current, advogadoResponsavelId: event.target.value }))}
                  className={selectClass}
                >
                  <option value="">Sem responsável definido</option>
                  {opcoesResponsavel.map((responsavel) => (
                    <option key={responsavel.id} value={responsavel.id}>{responsavel.nome}{!responsavel.ativo ? " (inativo)" : ""}</option>
                  ))}
                </select>
              </label>
            </fieldset>

            <fieldset className="grid gap-4 border-t border-stone-100 pt-5 dark:border-zinc-800 sm:grid-cols-2">
              <legend className="sr-only">Identificação do pedido</legend>
              {labelInput("pedido-etapa", "Etapa", form.etapa, (value) => setForm((current) => ({ ...current, etapa: value })), { maxLength: 120, required: true })}
              {labelInput("pedido-protocolo", "Número do protocolo/requerimento", form.numeroProtocolo, (value) => setForm((current) => ({ ...current, numeroProtocolo: value })), { maxLength: 100 })}
              {labelInput("pedido-originario", "Processo originário", form.processoOriginario, (value) => setForm((current) => ({ ...current, processoOriginario: value })), { maxLength: 100 })}
              {labelInput("pedido-pasta", "Pasta / caso", form.pastaCaso, (value) => setForm((current) => ({ ...current, pastaCaso: value })), { maxLength: 160 })}
              <DatePicker
                label="Data do requerimento"
                labelClassName={labelClass}
                value={form.dataRequerimento}
                onChange={(value) => setForm((current) => ({ ...current, dataRequerimento: value }))}
                inputClassName="shadow-none"
              />
            </fieldset>

            {(canReadFinanceiro || canWriteFinanceiro) && (
              <fieldset className="grid gap-4 border-t border-stone-100 pt-5 dark:border-zinc-800 sm:grid-cols-2">
                <legend className="sr-only">Valores e honorários</legend>
                {canReadFinanceiro && (
                  <label htmlFor="pedido-valor-causa" className={labelClass}>
                    Valor da causa (R$)
                    <input
                      id="pedido-valor-causa"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.valorCausa}
                      onChange={(event) => setForm((current) => ({ ...current, valorCausa: event.target.value }))}
                      className={inputClass}
                    />
                  </label>
                )}
                {canWriteFinanceiro && (
                  <>
                    <label htmlFor="pedido-valor-honorarios" className={labelClass}>
                      Valor dos honorários (R$)
                      <input
                        id="pedido-valor-honorarios"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.valorHonorarios}
                        onChange={(event) => setForm((current) => ({ ...current, valorHonorarios: event.target.value }))}
                        className={inputClass}
                      />
                    </label>
                    <label htmlFor="pedido-percentual-honorarios" className={labelClass}>
                      Percentual de honorários (%)
                      <input
                        id="pedido-percentual-honorarios"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={form.percentualHonorarios}
                        onChange={(event) => setForm((current) => ({ ...current, percentualHonorarios: event.target.value }))}
                        className={inputClass}
                      />
                    </label>
                    <label htmlFor="pedido-contingenciamento" className={labelClass}>
                      Contingenciamento
                      <select
                        id="pedido-contingenciamento"
                        value={form.contingenciamento}
                        onChange={(event) => setForm((current) => ({ ...current, contingenciamento: event.target.value as FormState["contingenciamento"] }))}
                        className={selectClass}
                      >
                        <option value="nao">Não</option>
                        <option value="parcial">Parcial</option>
                        <option value="integral">Integral</option>
                      </select>
                    </label>
                  </>
                )}
              </fieldset>
            )}

            {erro && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">{erro}</p>}
          </div>
          <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-stone-100 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={fechar}
              disabled={salvando}
              className="min-h-10 rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-600 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/20 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#17191a] px-4 py-2 text-sm font-bold text-white transition hover:bg-stone-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/30 disabled:cursor-wait disabled:opacity-60 dark:bg-zinc-800 dark:hover:bg-zinc-700"
            >
              {salvando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {salvando ? "Salvando…" : "Salvar alterações"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
