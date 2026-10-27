"use client";

import { useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowDownLeft, ArrowUpRight, CheckCircle2, LoaderCircle, UserRound } from "lucide-react";
import { atualizarDespesaFinanceira, salvarLancamentoFinanceiro } from "@/app/actions/financeiro";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type TipoLancamento = "receita" | "despesa";
type ClienteOption = { id: string; nome: string };
export type DespesaParaEdicao = {
  id: string;
  descricao: string;
  categoria: string;
  valor: number;
  vencimento: string;
  status: "pendente" | "pago";
  cliente_id: string | null;
};

const CATEGORIAS: Record<TipoLancamento, string[]> = {
  receita: ["Honorários avulsos", "Consulta", "Acordo", "Reembolso", "Outras receitas"],
  despesa: ["Aluguel", "Folha e encargos", "Software e serviços", "Impostos e taxas", "Contas do escritório", "Terceiros", "Outras despesas"],
};

const MAX_LANCAMENTO_CENTS = 999_999_999 * 100;

function formatarCentavos(digitos: string) {
  if (!digitos) return "";
  const valor = digitos.padStart(3, "0");
  const inteiro = valor.slice(0, -2).replace(/^0+(?=\d)/, "");
  const inteiroComSeparador = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${inteiroComSeparador},${valor.slice(-2)}`;
}

export function FinanceiroLancamentoDialog({
  open,
  onOpenChange,
  tipo,
  clientes,
  hoje,
  lancamento,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipo: TipoLancamento;
  clientes: ClienteOption[];
  hoje: string;
  lancamento?: DespesaParaEdicao;
}) {
  const router = useRouter();
  const [descricao, setDescricao] = useState(lancamento?.descricao ?? "");
  const [categoria, setCategoria] = useState(lancamento?.categoria ?? CATEGORIAS[tipo][0]);
  const [valorCentavos, setValorCentavos] = useState(lancamento ? String(Math.round(lancamento.valor * 100)) : "");
  const valorInputRef = useRef<HTMLInputElement>(null);
  const [vencimento, setVencimento] = useState(lancamento?.vencimento ?? hoje);
  const [clienteId, setClienteId] = useState(lancamento?.cliente_id ?? "");
  const [status, setStatus] = useState<"pendente" | "pago">(lancamento?.status ?? "pendente");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    const input = valorInputRef.current;
    if (input && document.activeElement === input) {
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }, [valorCentavos]);

  function handleValorChange(inputValue: string) {
    const digits = inputValue.replace(/\D/g, "").slice(0, 11).replace(/^0+(?=\d)/, "");
    if (Number(digits || 0) <= MAX_LANCAMENTO_CENTS) setValorCentavos(digits);
  }

  function handleValorKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Backspace") return;

    event.preventDefault();
    const input = valorInputRef.current;
    const selecionouTudo = input?.selectionStart === 0 && input.selectionEnd === input.value.length;
    setValorCentavos((current) => selecionouTudo ? "" : current.slice(0, -1));
  }

  function close(nextOpen: boolean) {
    if (!nextOpen) setError(null);
    onOpenChange(nextOpen);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setError(null);
    try {
      const dadosLancamento = {
        tipo,
        descricao,
        categoria,
        valor: Number(valorCentavos || 0) / 100,
        vencimento,
        status,
        cliente_id: clienteId || null,
      };
      const result = lancamento
        ? await atualizarDespesaFinanceira(lancamento.id, dadosLancamento)
        : await salvarLancamentoFinanceiro(dadosLancamento);
      if ("error" in result) {
        setError(result.error);
        return;
      }

      setDescricao("");
      setCategoria(CATEGORIAS[tipo][0]);
      setValorCentavos("");
      setVencimento(hoje);
      setClienteId("");
      setStatus("pendente");
      close(false);
      router.refresh();
    } catch {
      setError("Não foi possível salvar o lançamento. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  const isReceipt = tipo === "receita";
  const Icon = isReceipt ? ArrowDownLeft : ArrowUpRight;
  const fieldClass = "mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-stone-50/60 px-3.5 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-gold/70 focus:bg-white focus:ring-4 focus:ring-gold/10";

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[92dvh] w-[calc(100%-1rem)] overflow-y-auto rounded-2xl border border-stone-200 bg-white p-0 shadow-2xl sm:w-full sm:max-w-xl">
        <DialogHeader className="border-b border-stone-100 bg-gradient-to-br from-white to-stone-50/80 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", isReceipt ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}><Icon className="h-5 w-5" aria-hidden="true" /></span>
            <div className="min-w-0"><DialogTitle className="text-base font-black text-[#17191a]">{lancamento ? "Editar despesa" : `Registrar ${tipo}`}</DialogTitle><DialogDescription className="mt-1 text-xs text-stone-500">{lancamento ? "Atualize os dados desta despesa." : isReceipt ? "Inclua uma receita avulsa. As parcelas de contratos de honorários já entram automaticamente." : "Inclua uma despesa para acompanhar o vencimento e o pagamento."}</DialogDescription></div>
          </div>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-stone-600 sm:col-span-2">Descrição <span className="text-rose-500">*</span><input required minLength={2} maxLength={160} autoFocus value={descricao} onChange={(event) => setDescricao(event.target.value)} placeholder={isReceipt ? "Ex.: Honorários de consulta" : "Ex.: Assinatura de sistema jurídico"} className={fieldClass} /></label>
            <label className="text-xs font-semibold text-stone-600">Categoria <span className="text-rose-500">*</span><select required value={categoria} onChange={(event) => setCategoria(event.target.value)} className={fieldClass}>{lancamento && !CATEGORIAS[tipo].includes(lancamento.categoria) && <option value={lancamento.categoria}>{lancamento.categoria}</option>}{CATEGORIAS[tipo].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label className="text-xs font-semibold text-stone-600">Valor <span className="text-rose-500">*</span><div className="relative mt-1.5"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">R$</span><input ref={valorInputRef} required type="text" inputMode="numeric" autoComplete="off" maxLength={13} value={formatarCentavos(valorCentavos)} onChange={(event) => handleValorChange(event.target.value)} onKeyDown={handleValorKeyDown} onFocus={(event) => event.currentTarget.setSelectionRange(event.currentTarget.value.length, event.currentTarget.value.length)} onClick={(event) => event.currentTarget.setSelectionRange(event.currentTarget.value.length, event.currentTarget.value.length)} placeholder="0,00" aria-label="Valor em reais; os dígitos são preenchidos da direita para a esquerda, começando pelos centavos" className={cn(fieldClass, "mt-0 pl-9 text-right font-bold tabular-nums")} /></div></label>
            <label className="text-xs font-semibold text-stone-600">Vencimento <span className="text-rose-500">*</span><input required type="date" value={vencimento} onChange={(event) => setVencimento(event.target.value)} className={fieldClass} /></label>
            <label className="text-xs font-semibold text-stone-600">Situação<select value={status} onChange={(event) => setStatus(event.target.value as "pendente" | "pago")} className={fieldClass}><option value="pendente">Em aberto</option><option value="pago">{isReceipt ? "Recebido" : "Pago"}</option></select></label>
            <label className="text-xs font-semibold text-stone-600 sm:col-span-2">Cliente relacionado <span className="font-normal text-stone-400">(opcional)</span><span className="relative mt-1.5 block"><UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" /><select value={clienteId} onChange={(event) => setClienteId(event.target.value)} className={cn(fieldClass, "pl-10")}><option value="">Sem cliente específico</option>{clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>)}</select></span></label>
          </div>

          {error && <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs text-rose-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{error}</p>}

          <div className="flex flex-col-reverse gap-2 border-t border-stone-100 pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => close(false)} disabled={saving} className="h-11 rounded-xl px-5">Cancelar</Button>
            <Button type="submit" disabled={saving} className={cn("h-11 rounded-xl px-5 font-bold text-white shadow-sm", isReceipt ? "bg-emerald-700 hover:bg-emerald-800" : "bg-[#17191a] hover:bg-[#343637]")}>{saving ? <LoaderCircle className="animate-spin" /> : <CheckCircle2 />}{saving ? "Salvando..." : lancamento ? "Salvar alterações" : "Salvar lançamento"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
