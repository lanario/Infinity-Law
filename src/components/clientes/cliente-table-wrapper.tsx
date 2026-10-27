"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Edit, MessageCircle, ChevronRight, ChevronLeft, User, Users, Building2, LayoutGrid, List, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useClientesRealtime } from "@/hooks/use-clientes";
import { ClienteSearch } from "./cliente-search";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatDocument, formatPhone } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { ClienteComProcessos } from "@/types/domain";

const ClienteForm = dynamic(() => import("@/components/clientes/cliente-form").then((m) => m.ClienteForm), {
  ssr: false,
  loading: () => <Skeleton className="h-[480px] rounded-2xl motion-reduce:animate-none" />,
});

interface ClienteTableWrapperProps {
  initialData: ClienteComProcessos[];
  nextCursor: string | null;
  hasMore: boolean;
  currentSearch: string;
  currentStatus: string;
  canCreate: boolean;
  stats: { total: number; pessoaFisica: number; pessoaJuridica: number };
}

export function ClienteTableWrapper({
  initialData,
  nextCursor,
  hasMore,
  currentSearch,
  currentStatus,
  canCreate,
  stats,
}: ClienteTableWrapperProps) {
  const clientes = useClientesRealtime({ initialData });
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [view, setView] = useState<"list" | "grid">("list");
  const [createOpen, setCreateOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [loadingCliente, setLoadingCliente] = useState<{ id: string; nome: string; tipo: string; telefone: string | null } | null>(null);

  function goToNext() {
    const params = new URLSearchParams(searchParams.toString());
    if (nextCursor) params.set("cursor", nextCursor);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function goToPrev() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("cursor");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function changeStatus(status: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (status === "ativos") params.delete("status");
    else params.set("status", status);
    params.delete("cursor");
    router.replace(params.size ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
  }

  const hasCursor = !!searchParams.get("cursor");

  function openCliente(cliente: { id: string; nome: string; tipo: string; telefone: string | null }, aba?: "resumo" | "cadastro") {
    if (loadingCliente) return;
    setLoadingCliente(cliente);
    router.push(`/clientes/${cliente.id}${aba ? `?aba=${aba}` : ""}`);
  }

  function prefetchCliente(id: string) {
    router.prefetch(`/clientes/${id}`);
  }

  function handleOpenClienteLink(
    event: React.MouseEvent<HTMLAnchorElement>,
    cliente: { id: string; nome: string; tipo: string; telefone: string | null },
    aba?: "resumo" | "cadastro",
  ) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    openCliente(cliente, aba);
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Clientes cadastrados", value: stats.total, accent: "bg-[#17191a]", icon: Users },
          { label: "Pessoas físicas", value: stats.pessoaFisica, accent: "bg-gold", icon: User },
          { label: "Pessoas jurídicas", value: stats.pessoaJuridica, accent: "bg-emerald-500", icon: Building2 },
        ].map((stat) => (
          <div key={stat.label} className="group flex items-center gap-3 rounded-2xl border border-stone-200/80 bg-white px-4 py-4 shadow-[0_8px_24px_-20px_rgba(23,25,26,0.4)] transition-[box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-20px_rgba(23,25,26,0.28)] sm:px-5">
            <span className={cn("h-8 w-1 rounded-full", stat.accent)} aria-hidden="true" />
            <div className="min-w-0 flex-1"><p className="text-2xl font-black leading-none tracking-tight tabular-nums text-[#17191a]">{stat.value}</p><p className="mt-1.5 text-xs font-medium text-stone-500">{stat.label}</p></div>
            <stat.icon className="h-[18px] w-[18px] text-stone-300 transition-colors group-hover:text-gold-dark" aria-hidden="true" />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-base font-black tracking-tight text-[#17191a]">Base de clientes</p><p className="mt-0.5 text-xs text-stone-400">{clientes.length} exibido{clientes.length === 1 ? "" : "s"} nesta página</p></div>
        {canCreate && <button type="button" onClick={() => setCreateOpen(true)} className="group inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gold px-5 text-sm font-bold text-white shadow-[0_8px_18px_-10px_rgba(156,125,31,0.8)] transition duration-200 hover:-translate-y-0.5 hover:bg-gold-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/20 active:translate-y-0"><Plus className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" aria-hidden="true" /> Novo cliente</button>}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-stone-200/80 bg-white p-3 shadow-[0_8px_24px_-20px_rgba(23,25,26,0.4)] sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4">
        <div className="min-w-0 flex-1 sm:max-w-xl">
          <ClienteSearch initialValue={currentSearch} />
        </div>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <div className="flex gap-1 rounded-xl bg-stone-100/80 p-1" aria-label="Filtrar clientes por situação">
            {[{ value: "todos", label: "Todos" }, { value: "ativos", label: "Ativos" }, { value: "arquivados", label: "Arquivados" }].map((tab) => (
              <button key={tab.value} type="button" onClick={() => changeStatus(tab.value)} aria-pressed={currentStatus === tab.value} className={cn("whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition-all duration-200", currentStatus === tab.value ? "bg-white text-[#17191a] shadow-sm" : "text-stone-500 hover:text-stone-800")}>{tab.label}</button>
            ))}
          </div>
          <div className="flex shrink-0 rounded-xl border border-stone-200 p-1" aria-label="Formato da visualização">
            <button type="button" onClick={() => setView("grid")} aria-label="Visualização em cartões" aria-pressed={view === "grid"} className={cn("rounded-lg p-2 transition-all duration-200", view === "grid" ? "bg-[#17191a] text-gold shadow-sm" : "text-stone-400 hover:bg-stone-50 hover:text-stone-700")}><LayoutGrid className="h-4 w-4" aria-hidden="true" /></button>
            <button type="button" onClick={() => setView("list")} aria-label="Visualização em lista" aria-pressed={view === "list"} className={cn("rounded-lg p-2 transition-all duration-200", view === "list" ? "bg-[#17191a] text-gold shadow-sm" : "text-stone-400 hover:bg-stone-50 hover:text-stone-700")}><List className="h-4 w-4" aria-hidden="true" /></button>
          </div>
        </div>
      </div>

      {view === "grid" ? (
        <div key="grid" className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-3", isPending && "opacity-60 transition-opacity")} aria-busy={isPending}>
            {clientes.length === 0 ? (
              <div key="empty" className="col-span-full rounded-2xl border border-dashed border-stone-300 bg-white/70 px-6 py-14 text-center">
                <Users className="mx-auto h-7 w-7 text-gold-dark" aria-hidden="true" />
                <p className="mt-3 text-sm font-bold text-stone-700">Nenhum cliente encontrado</p>
                <p className="mt-1 text-xs text-stone-400">Ajuste os filtros ou cadastre um novo cliente.</p>
              </div>
            ) : clientes.map((cliente) => {
              const count = (cliente as ClienteComProcessos & { processos_count?: [{ count: number }] }).processos_count?.[0]?.count ?? 0;
              return (
                <article key={cliente.id} onPointerEnter={() => prefetchCliente(cliente.id)} onFocus={() => prefetchCliente(cliente.id)} onClick={(event) => { if (!(event.target instanceof Element) || !event.target.closest("a,button")) openCliente(cliente); }} onKeyDown={(event) => { if (event.key === "Enter" && event.target === event.currentTarget) openCliente(cliente); }} role="link" tabIndex={0} aria-label={`Abrir prontuário de ${cliente.nome}`} className="cursor-pointer rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_8px_24px_-20px_rgba(23,25,26,0.4)] transition-[transform,border-color] duration-150 hover:-translate-y-0.5 hover:border-gold/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/20">
                  <div className="flex items-start gap-3">
                    <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", cliente.tipo === "pf" ? "bg-stone-100 text-stone-600" : "bg-gold-soft text-gold-dark")}>{cliente.tipo === "pf" ? <User className="h-5 w-5" aria-hidden="true" /> : <Building2 className="h-5 w-5" aria-hidden="true" />}</span>
                    <div className="min-w-0 flex-1"><Link href={`/clientes/${cliente.id}`} onClick={(event) => handleOpenClienteLink(event, cliente)} className="block truncate text-sm font-black text-[#17191a] hover:text-gold-dark">{cliente.nome}</Link><p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-stone-400">{cliente.tipo === "pf" ? "Pessoa física" : "Pessoa jurídica"}</p></div>
                    <span className={cn("rounded-full border px-2 py-1 text-[9px] font-bold", cliente.ativo ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-stone-200 bg-stone-100 text-stone-500")}>{cliente.ativo ? "Ativo" : "Arquivado"}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-stone-50/80 p-3">
                    <div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-wide text-stone-400">Documento</p><p className="mt-1 truncate font-mono text-[11px] font-semibold text-stone-700">{cliente.cpf_cnpj ? formatDocument(cliente.cpf_cnpj, cliente.tipo as "pf" | "pj") : "Não informado"}</p></div>
                    <div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-wide text-stone-400">Processos</p><p className="mt-1 text-[11px] font-semibold text-stone-700">{count}</p></div>
                    <div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-wide text-stone-400">Telefone</p><p className="mt-1 truncate text-[11px] font-semibold text-stone-700">{cliente.telefone ? formatPhone(cliente.telefone) : "—"}</p></div>
                    <div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-wide text-stone-400">Localidade</p><p className="mt-1 truncate text-[11px] font-semibold text-stone-700">{[cliente.cidade, cliente.estado].filter(Boolean).join(" / ") || "—"}</p></div>
                  </div>
                  <div className="mt-3 flex justify-end gap-1 border-t border-stone-100 pt-3">
                    {cliente.telefone && <a href={`https://wa.me/55${cliente.telefone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="rounded-lg p-2 text-stone-400 transition hover:bg-emerald-50 hover:text-emerald-600" aria-label={`Enviar WhatsApp para ${cliente.nome}`}><MessageCircle className="h-4 w-4" aria-hidden="true" /></a>}
                    <Link href={`/clientes/${cliente.id}?aba=cadastro`} onClick={(event) => handleOpenClienteLink(event, cliente, "cadastro")} className="rounded-lg p-2 text-stone-400 transition hover:bg-gold-soft hover:text-gold-dark" aria-label={`Editar cadastro de ${cliente.nome}`}><Edit className="h-4 w-4" aria-hidden="true" /></Link>
                    <Link href={`/clientes/${cliente.id}`} onClick={(event) => handleOpenClienteLink(event, cliente)} className="rounded-lg p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700" aria-label={`Abrir prontuário de ${cliente.nome}`}><ChevronRight className="h-4 w-4" aria-hidden="true" /></Link>
                  </div>
                </article>
              );
            })}
        </div>
      ) : (
      <div key="list" aria-busy={isPending} className={cn("overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_8px_24px_-20px_rgba(23,25,26,0.4)]", isPending && "opacity-60 transition-opacity")}>
        <table className="w-full text-sm" role="table">
          <caption className="sr-only">Lista de clientes do escritório</caption>
          <thead className="border-b border-stone-100 bg-stone-50/60">
            <tr>
              <th scope="col" className="px-5 py-4 text-left text-xs font-bold text-stone-400">Nome</th>
              <th scope="col" className="hidden px-5 py-4 text-left text-xs font-bold text-stone-400 md:table-cell">CPF/CNPJ</th>
              <th scope="col" className="hidden px-5 py-4 text-left text-xs font-bold text-stone-400 lg:table-cell">Telefone</th>
              <th scope="col" className="hidden px-5 py-4 text-left text-xs font-bold text-stone-400 sm:table-cell">Processos</th>
              <th scope="col" className="px-5 py-4 text-right text-xs font-bold text-stone-400">Ações</th>
            </tr>
          </thead>
          <tbody>
              {clientes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-sm text-stone-400">
                    <Users className="mx-auto h-7 w-7 text-stone-300" aria-hidden="true" />
                    <span className="mt-3 block font-semibold text-stone-500">Nenhum cliente encontrado</span>
                    <span className="mt-1 block text-xs">Ajuste a busca ou os filtros para ver outros clientes.</span>
                  </td>
                </tr>
              ) : (
                clientes.map((cliente) => (
                  <tr
                    key={cliente.id}
                    onPointerEnter={() => prefetchCliente(cliente.id)}
                    onFocus={() => prefetchCliente(cliente.id)}
                    onClick={(event) => { if (!(event.target instanceof Element) || !event.target.closest("a,button")) openCliente(cliente); }}
                    onKeyDown={(event) => { if (event.key === "Enter" && event.target === event.currentTarget) openCliente(cliente); }}
                    role="link"
                    tabIndex={0}
                    aria-label={`Abrir prontuário de ${cliente.nome}`}
                    className="group cursor-pointer border-b border-stone-100 transition-colors duration-150 last:border-0 hover:bg-[rgba(250,248,242,0.78)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold/40"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-medium transition-transform duration-150 group-hover:scale-105",
                          cliente.tipo === "pf"
                            ? "bg-stone-100 text-stone-600"
                            : "bg-gold-soft text-gold-text"
                        )}>
                          {cliente.tipo === "pf"
                            ? <User className="h-3.5 w-3.5" aria-hidden="true" />
                            : <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                          }
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/clientes/${cliente.id}`}
                            onClick={(event) => handleOpenClienteLink(event, cliente)}
                            className="block truncate text-sm font-bold text-[#252728] transition-colors hover:text-gold-dark"
                          >
                            {cliente.nome}
                          </Link>
                          <p className="mt-0.5 text-[10px] text-stone-400">
                            {cliente.tipo === "pf" ? "Pessoa Física" : "Pessoa Jurídica"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-5 py-4 md:table-cell">
                      <span className="font-mono text-xs text-stone-500">
                        {cliente.cpf_cnpj
                          ? formatDocument(cliente.cpf_cnpj, cliente.tipo as "pf" | "pj")
                          : "—"}
                      </span>
                    </td>
                    <td className="hidden px-5 py-4 lg:table-cell">
                      <span className="text-xs text-stone-500">
                        {cliente.telefone ? formatPhone(cliente.telefone) : "—"}
                      </span>
                    </td>
                    <td className="hidden px-5 py-4 sm:table-cell">
                      <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold tabular-nums text-stone-600">
                        {(cliente as ClienteComProcessos & { processos_count?: [{ count: number }] })
                          .processos_count?.[0]?.count ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {cliente.telefone && (
                          <a
                            href={`https://wa.me/55${cliente.telefone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg p-2 text-stone-300 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
                            aria-label={`Enviar WhatsApp para ${cliente.nome}`}
                          >
                            <MessageCircle className="h-4 w-4" aria-hidden="true" />
                          </a>
                        )}
                        <Link
                          href={`/clientes/${cliente.id}?aba=cadastro`}
                          onClick={(event) => handleOpenClienteLink(event, cliente, "cadastro")}
                          className="rounded-lg p-2 text-stone-300 transition-colors hover:bg-gold-soft hover:text-gold-dark"
                          aria-label={`Editar cadastro de ${cliente.nome}`}
                        >
                          <Edit className="h-4 w-4" aria-hidden="true" />
                        </Link>
                        <Link
                          href={`/clientes/${cliente.id}`}
                          onClick={(event) => handleOpenClienteLink(event, cliente)}
                          className="rounded-lg p-2 text-stone-300 transition-colors hover:bg-stone-100 hover:text-stone-700"
                          aria-label={`Abrir prontuário de ${cliente.nome}`}
                        >
                          <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
          </tbody>
        </table>
      </div>
      )}

      {/* Paginação cursor-based */}
      {(hasCursor || hasMore) && (
        <div className={cn("flex items-center justify-between rounded-2xl border border-stone-200/80 bg-white px-4 py-3 shadow-[0_8px_24px_-20px_rgba(23,25,26,0.4)]", isPending && "opacity-60 transition-opacity")}>
          <button
            onClick={goToPrev}
            disabled={!hasCursor || isPending}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-stone-500 transition hover:bg-stone-50 hover:text-stone-800 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Anterior
          </button>
          <button
            onClick={goToNext}
            disabled={!hasMore || isPending}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-stone-500 transition hover:bg-stone-50 hover:text-stone-800 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Próxima
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[calc(100dvh-1rem)] max-w-5xl flex-col gap-0 overflow-hidden rounded-3xl border border-stone-200/80 bg-[#fcfcfb] p-0 shadow-[0_32px_100px_-35px_rgba(23,25,26,0.48)] sm:max-h-[calc(100dvh-3rem)] sm:max-w-5xl"
        >
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-stone-200/80 bg-white/90 px-5 py-4 sm:px-7 sm:py-5">
            <div className="min-w-0">
              <DialogTitle className="text-lg font-black tracking-tight text-[#17191a] sm:text-xl">Novo cliente</DialogTitle>
              <DialogDescription className="mt-1 text-xs text-stone-500 sm:text-sm">Preencha os dados de identificação, contato e endereço.</DialogDescription>
            </div>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="-mr-1 -mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/20"
              aria-label="Fechar cadastro de cliente"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
            {createOpen && (
              <ClienteForm
                layout="modal"
                onCancel={() => setCreateOpen(false)}
                onSaved={() => {
                  setCreateOpen(false);
                  startTransition(() => router.refresh());
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AnimatePresence>
        {loadingCliente && (
          <motion.div
            key="cliente-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-[#111211]/65 px-4 pb-8 pt-[9vh] backdrop-blur-md"
            aria-busy="true"
          >
            <motion.section
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.985 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-xl overflow-hidden rounded-3xl border border-gold/25 bg-[radial-gradient(ellipse_at_top_left,rgba(212,175,55,0.16),transparent_55%),#17191a] text-white shadow-[0_30px_100px_-30px_rgba(0,0,0,0.8)]"
            >
              <div className="flex items-start gap-3.5 px-5 py-5 sm:gap-4 sm:px-7 sm:py-6">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold shadow-[0_0_28px_-10px_rgba(212,175,55,0.6)]">
                  {loadingCliente.tipo === "pf" ? <User className="h-6 w-6" aria-hidden="true" /> : <Building2 className="h-6 w-6" aria-hidden="true" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gold">Abrindo prontuário</p>
                    <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-emerald-300">Cliente</span>
                  </div>
                  <h2 className="mt-1 truncate text-base font-black uppercase tracking-wide sm:text-lg">{loadingCliente.nome}</h2>
                  <p className="mt-1 flex items-center gap-1.5 text-[11px] text-stone-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" aria-hidden="true" />
                    {loadingCliente.telefone ? formatPhone(loadingCliente.telefone) : "Organizando os dados jurídicos do cliente…"}
                  </p>
                </div>
              </div>
              <div className="border-t border-white/10 px-5 pb-4 pt-3 sm:px-7 sm:pb-5">
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full w-2/5 rounded-full bg-gradient-to-r from-gold-dark via-gold to-white shadow-[0_0_18px_rgba(212,175,55,0.5)]"
                    animate={{ x: ["-100%", "260%"] }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>
                <p className="mt-2.5 text-[10px] text-stone-400" role="status" aria-live="polite">Carregando processos, documentos e histórico do cliente…</p>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
