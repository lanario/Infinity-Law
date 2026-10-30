"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Search, Shield, ShieldCheck, Users, XCircle, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACTIONS, MODULES, MODULE_LABELS, ACTION_LABELS } from "@/lib/permissions";
import type { PermissionsMap } from "@/types/permissions";
import { salvarAcessoUsuario, salvarPermissoesCargo } from "@/app/actions/configuracoes";

type UsuarioRow = { id: string; nome: string; email: string; ativo: boolean; cargo_id: string | null; cargos: { nome: string } | { nome: string }[] | null };
type CargoRow = { id: string; nome: string; is_admin: boolean; permissoes: PermissionsMap };
type UserDraft = { cargo_id: string | null; ativo: boolean };

export function UsuariosPanel({ usuarios, cargos, currentUserId, canWrite }: { usuarios: UsuarioRow[]; cargos: CargoRow[]; currentUserId: string; canWrite: boolean }) {
  const router = useRouter();
  const [tab, setTab] = useState<"usuarios" | "cargos">("usuarios");
  const [selectedCargo, setSelectedCargo] = useState<string | null>(cargos[0]?.id ?? null);
  const [draftPermissions, setDraftPermissions] = useState<PermissionsMap>({});
  const [userDrafts, setUserDrafts] = useState<Record<string, UserDraft>>({});
  const [search, setSearch] = useState("");
  const [savingCargo, setSavingCargo] = useState(false);
  const [savingUser, setSavingUser] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const cargoSelecionado = cargos.find((cargo) => cargo.id === selectedCargo);
  const selectedCargoIsOwn = usuarios.find((usuario) => usuario.id === currentUserId)?.cargo_id === cargoSelecionado?.id;

  useEffect(() => {
    setUserDrafts(Object.fromEntries(usuarios.map((usuario) => [usuario.id, { cargo_id: usuario.cargo_id, ativo: usuario.ativo }])));
  }, [usuarios]);
  useEffect(() => setDraftPermissions(cargoSelecionado?.permissoes ?? {}), [cargoSelecionado]);

  const filteredUsuarios = useMemo(() => usuarios.filter((usuario) => `${usuario.nome} ${usuario.email}`.toLowerCase().includes(search.toLowerCase())), [usuarios, search]);
  const permissionChanged = JSON.stringify(draftPermissions) !== JSON.stringify(cargoSelecionado?.permissoes ?? {});

  async function saveUser(userId: string) {
    const draft = userDrafts[userId];
    if (!draft || savingUser) return;
    setSavingUser(userId); setMessage("");
    try {
      const result = await salvarAcessoUsuario(userId, draft);
      if ("error" in result) { setMessage(result.error); return; }
      setMessage("Acesso atualizado."); startTransition(() => router.refresh());
    } catch { setMessage("Não foi possível atualizar este acesso."); }
    finally { setSavingUser(null); }
  }

  async function savePermissions() {
    if (!cargoSelecionado || !canWrite || savingCargo) return;
    setSavingCargo(true); setMessage("");
    try {
      const result = await salvarPermissoesCargo(cargoSelecionado.id, draftPermissions);
      if ("error" in result) { setMessage(result.error); return; }
      setMessage("Permissões do cargo atualizadas."); startTransition(() => router.refresh());
    } catch { setMessage("Não foi possível salvar as permissões."); }
    finally { setSavingCargo(false); }
  }

  function setPermission(module: (typeof MODULES)[number], action: (typeof ACTIONS)[number], checked: boolean) {
    setDraftPermissions((current) => ({ ...current, [module]: { ...current[module], [action]: checked } }));
  }

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex gap-1 rounded-xl bg-stone-100 p-1 dark:bg-zinc-800/80"><button type="button" onClick={() => setTab("usuarios")} className={cn("flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition", tab === "usuarios" ? "bg-white text-[#17191a] shadow-sm dark:bg-zinc-900 dark:text-zinc-100" : "text-stone-500 hover:text-stone-800 dark:text-zinc-400 dark:hover:text-zinc-100")}><Users className="h-3.5 w-3.5" />Usuários <span className="text-stone-400 dark:text-zinc-500">{usuarios.length}</span></button><button type="button" onClick={() => setTab("cargos")} className={cn("flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition", tab === "cargos" ? "bg-white text-[#17191a] shadow-sm dark:bg-zinc-900 dark:text-zinc-100" : "text-stone-500 hover:text-stone-800 dark:text-zinc-400 dark:hover:text-zinc-100")}><Shield className="h-3.5 w-3.5" />Cargos <span className="text-stone-400 dark:text-zinc-500">{cargos.length}</span></button></div>
      {tab === "usuarios" && <label className="relative block w-full max-w-xs"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400 dark:text-zinc-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar integrante..." className="h-9 w-full rounded-xl border border-stone-200 bg-white pl-9 pr-3 text-xs text-stone-800 outline-none focus:border-gold/60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500" /></label>}
    </div>
    {message && <p role="status" className="rounded-xl border border-gold/20 bg-gold-soft px-3.5 py-2.5 text-xs text-gold-dark dark:border-[#D4AF37]/30 dark:bg-[#D4AF37]/15 dark:text-[#E5C158]">{message}</p>}

    {tab === "usuarios" && <section className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_8px_24px_-20px_rgba(23,25,26,.4)] dark:border-zinc-800 dark:bg-zinc-900"><div className="border-b border-stone-100 px-4 py-3 dark:border-zinc-800 sm:px-5"><h2 className="text-xs font-black text-[#17191a] dark:text-zinc-100">Equipe do escritório</h2><p className="mt-1 text-[11px] text-stone-400 dark:text-zinc-400">Ajuste cargo e acesso de cada integrante.</p></div><div className="divide-y divide-stone-100 dark:divide-zinc-800">{filteredUsuarios.map((usuario) => {
      const draft = userDrafts[usuario.id] ?? { cargo_id: usuario.cargo_id, ativo: usuario.ativo };
      const locked = usuario.id === currentUserId || Boolean(cargos.find((item) => item.id === usuario.cargo_id)?.is_admin);
      const dirty = draft.cargo_id !== usuario.cargo_id || draft.ativo !== usuario.ativo;
      return <article key={usuario.id} className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-stone-50/40 dark:hover:bg-zinc-800/60 sm:flex-row sm:items-center sm:px-5"><div className="flex min-w-0 flex-1 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#17191a] text-xs font-black text-gold dark:bg-zinc-800 dark:text-[#E5C158]">{usuario.nome.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span><div className="min-w-0"><h3 className="truncate text-xs font-bold text-stone-800 dark:text-zinc-100">{usuario.nome}{usuario.id === currentUserId && <span className="ml-1.5 text-[9px] font-medium text-stone-400 dark:text-zinc-400">Você</span>}</h3><p className="truncate text-[10px] text-stone-400 dark:text-zinc-400">{usuario.email}</p></div></div><div className="flex flex-wrap items-center gap-2 sm:justify-end"><label className="sr-only" htmlFor={`cargo-${usuario.id}`}>Cargo de {usuario.nome}</label><select id={`cargo-${usuario.id}`} disabled={!canWrite || locked} value={draft.cargo_id ?? ""} onChange={(event) => setUserDrafts((current) => ({ ...current, [usuario.id]: { ...draft, cargo_id: event.target.value || null } }))} className="h-9 min-w-36 rounded-lg border border-stone-200 bg-white px-2.5 text-[11px] text-stone-700 outline-none focus:border-gold/50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"><option value="">Sem cargo</option>{cargos.filter((item) => !item.is_admin || item.id === usuario.cargo_id).map((item) => <option key={item.id} value={item.id}>{item.nome}{item.is_admin ? " · Admin" : ""}</option>)}</select><button type="button" disabled={!canWrite || locked || savingUser === usuario.id} onClick={() => setUserDrafts((current) => ({ ...current, [usuario.id]: { ...draft, ativo: !draft.ativo } }))} className={cn("inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[10px] font-bold transition disabled:cursor-not-allowed disabled:opacity-50", draft.ativo ? "border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300" : "border-stone-200 bg-stone-50 text-stone-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400")}>{draft.ativo ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}{draft.ativo ? "Ativo" : "Inativo"}</button>{canWrite && !locked && <button type="button" onClick={() => saveUser(usuario.id)} disabled={!dirty || savingUser !== null} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#17191a] px-3 text-[10px] font-bold text-white transition hover:bg-[#303334] disabled:cursor-not-allowed disabled:opacity-35 dark:bg-[#D4AF37] dark:text-zinc-950 dark:hover:bg-[#E5C158]"><Save className="h-3 w-3" />{savingUser === usuario.id ? "Salvando" : "Salvar"}</button>}</div></article>;
    })}{filteredUsuarios.length === 0 && <p className="px-4 py-12 text-center text-xs text-stone-400 dark:text-zinc-400">Nenhum integrante encontrado.</p>}</div></section>}

    {tab === "cargos" && <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]"><section className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900"><div className="border-b border-stone-100 px-4 py-3 dark:border-zinc-800"><h2 className="text-xs font-black text-stone-700 dark:text-zinc-100">Cargos e perfis</h2></div><div className="divide-y divide-stone-100 dark:divide-zinc-800">{cargos.map((cargo) => <button type="button" key={cargo.id} onClick={() => { setSelectedCargo(cargo.id); setMessage(""); }} className={cn("flex w-full items-center gap-3 px-4 py-3 text-left transition", selectedCargo === cargo.id ? "bg-gold-soft dark:bg-[#D4AF37]/15" : "hover:bg-stone-50 dark:hover:bg-zinc-800/60")}><span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", cargo.is_admin ? "bg-[#17191a] text-gold dark:bg-zinc-800 dark:text-[#E5C158]" : "bg-stone-100 text-stone-500 dark:bg-zinc-800 dark:text-zinc-400")}><Shield className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-stone-700 dark:text-zinc-100">{cargo.nome}</span><span className="text-[10px] text-stone-400 dark:text-zinc-400">{cargo.is_admin ? "Acesso total" : "Perfil personalizado"}</span></span></button>)}{!cargos.length && <p className="px-4 py-8 text-center text-xs text-stone-400 dark:text-zinc-400">Nenhum cargo cadastrado.</p>}</div></section>
      <section className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-4 py-4 dark:border-zinc-800 sm:px-5"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-gold-dark dark:text-[#E5C158]" /><div><h2 className="text-xs font-black text-[#17191a] dark:text-zinc-100">{cargoSelecionado?.nome ?? "Selecione um cargo"}</h2><p className="mt-0.5 text-[10px] text-stone-400 dark:text-zinc-400">Permissões por módulo e operação</p></div></div>{canWrite && cargoSelecionado && !cargoSelecionado.is_admin && !selectedCargoIsOwn && <button type="button" onClick={savePermissions} disabled={!permissionChanged || savingCargo} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gold px-3 text-[10px] font-bold text-white transition hover:bg-gold-hover disabled:opacity-40"><Save className="h-3 w-3" />{savingCargo ? "Salvando..." : "Salvar permissões"}</button>}</div>
      {cargoSelecionado ? cargoSelecionado.is_admin ? <div className="m-4 rounded-xl border border-gold/20 bg-gold-soft p-4 text-xs text-gold-dark dark:border-[#D4AF37]/30 dark:bg-[#D4AF37]/15 dark:text-[#E5C158]">Este cargo mantém acesso integral ao sistema. Para segurança, as permissões administrativas não são limitadas nesta tela.</div> : selectedCargoIsOwn ? <div className="m-4 rounded-xl border border-stone-200 bg-stone-50 p-4 text-xs text-stone-600 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-300">Este é o cargo associado à sua conta. Por segurança, você não pode alterar as permissões do próprio perfil.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-xs"><thead><tr className="border-b border-stone-100 dark:border-zinc-800"><th className="px-4 py-3 text-left font-semibold text-stone-400 dark:text-zinc-400">Módulo</th>{ACTIONS.map((action) => <th key={action} className="px-4 py-3 text-center font-semibold text-stone-400 dark:text-zinc-400">{ACTION_LABELS[action]}</th>)}</tr></thead><tbody>{MODULES.map((module) => <tr key={module} className="border-b border-stone-50 last:border-0 hover:bg-stone-50/60 dark:border-zinc-800/70 dark:hover:bg-zinc-800/60"><th scope="row" className="px-4 py-2.5 text-left font-semibold text-stone-700 dark:text-zinc-100">{MODULE_LABELS[module]}</th>{ACTIONS.map((action) => <td key={action} className="px-4 py-2.5 text-center"><input aria-label={`${ACTION_LABELS[action]}: ${MODULE_LABELS[module]}`} type="checkbox" disabled={!canWrite} checked={Boolean(draftPermissions[module]?.[action])} onChange={(event) => setPermission(module, action, event.target.checked)} className="h-4 w-4 cursor-pointer accent-[#D4AF37] disabled:cursor-not-allowed dark:border-zinc-700 dark:bg-zinc-900" /></td>)}</tr>)}</tbody></table></div> : <div className="flex h-48 items-center justify-center text-xs text-stone-400 dark:text-zinc-400">Selecione um cargo para editar as permissões.</div>}</section></div>}
  </div>;
}
