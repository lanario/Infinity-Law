"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, dateFnsLocalizer, type View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { CalendarDays, Clock3, Save, Trash2, UserRound, X, type LucideIcon } from "lucide-react";
import { salvarEvento, excluirEvento } from "@/app/actions/agenda";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";
import { getAgendaDateKey, getISOForAgendaMinute, shiftAgendaDateKey, shiftAgendaMonthKey } from "@/lib/agenda/team-timeline.mjs";
import { AgendaSidebar, AgendaTopbar, AgendaWorkspaceViews, type AgendaCalendarMode, type AgendaEventTypeFilter } from "@/components/agenda/agenda-workspace-views";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales: { "pt-BR": ptBR },
});

type EventoTipo = "audiencia" | "reuniao" | "prazo" | "compromisso";

type EventoRaw = {
  id: string;
  titulo: string;
  tipo: EventoTipo;
  inicio: string;
  fim: string | null;
  dia_inteiro: boolean;
  processo_id: string | null;
  cliente_id: string | null;
  responsavel_id: string | null;
  descricao: string | null;
  local: string | null;
  link_videoconf: string | null;
};

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: { tipo: EventoTipo };
};

type FormState = {
  titulo: string;
  tipo: EventoTipo;
  inicio: string;
  fim: string;
  dia_inteiro: boolean;
  processo_id: string;
  cliente_id: string;
  responsavel_id: string;
  descricao: string;
  local: string;
  link_videoconf: string;
};

type SelectOption = { id: string; nome: string };
type ProcessoOption = { id: string; numero_cnj: string | null; tipo_acao: string | null };

const EVENT_TYPES: Array<{ value: EventoTipo; label: string; color: string; icon: LucideIcon }> = [
  { value: "audiencia", label: "Audiência", color: "#D4AF37", icon: CalendarDays },
  { value: "reuniao", label: "Reunião", color: "#3F3F46", icon: UserRound },
  { value: "prazo", label: "Prazo", color: "#DC5660", icon: Clock3 },
  { value: "compromisso", label: "Compromisso", color: "#8A8D91", icon: CalendarDays },
];

const MESSAGES = {
  today: "Hoje",
  previous: "Anterior",
  next: "Próximo",
  month: "Mês",
  week: "Semana",
  day: "Dia",
  agenda: "Lista",
  date: "Data",
  time: "Hora",
  event: "Evento",
  noEventsInRange: "Nenhum evento neste período",
};

const EMPTY_FORM: FormState = {
  titulo: "",
  tipo: "audiencia",
  inicio: "",
  fim: "",
  dia_inteiro: false,
  processo_id: "",
  cliente_id: "",
  responsavel_id: "",
  descricao: "",
  local: "",
  link_videoconf: "",
};

function toLocalInput(value: Date | string) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function buildForm(evento?: EventoRaw | null, start?: Date, end?: Date): FormState {
  if (evento) {
    return {
      titulo: evento.titulo,
      tipo: evento.tipo,
      inicio: toLocalInput(evento.inicio),
      fim: evento.fim ? toLocalInput(evento.fim) : "",
      dia_inteiro: evento.dia_inteiro,
      processo_id: evento.processo_id ?? "",
      cliente_id: evento.cliente_id ?? "",
      responsavel_id: evento.responsavel_id ?? "",
      descricao: evento.descricao ?? "",
      local: evento.local ?? "",
      link_videoconf: evento.link_videoconf ?? "",
    };
  }
  const inicio = start ? new Date(start) : new Date();
  if (start && inicio.getHours() === 0 && inicio.getMinutes() === 0) inicio.setHours(9, 0, 0, 0);
  const fim = end && end > inicio ? end : new Date(inicio.getTime() + 60 * 60 * 1000);
  return { ...EMPTY_FORM, inicio: toLocalInput(inicio), fim: toLocalInput(fim) };
}

interface CalendarViewProps {
  initialEventos: EventoRaw[];
  clientes: SelectOption[];
  processos: ProcessoOption[];
  membros: Array<{ id: string; nome: string; avatar_url: string | null; ativo: boolean }>;
  initialDateKey: string;
  canWrite: boolean;
  canDelete: boolean;
}

export function CalendarView({ initialEventos, clientes, processos, membros, initialDateKey, canWrite, canDelete }: CalendarViewProps) {
  const [eventos, setEventos] = useState(initialEventos);
  const [view, setView] = useState<View>("day");
  const [teamMode, setTeamMode] = useState(true);
  const [selectedDateKey, setSelectedDateKey] = useState(initialDateKey);
  const [selectedType, setSelectedType] = useState<AgendaEventTypeFilter>("todos");
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string> | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [agendaSidebarCollapsed, setAgendaSidebarCollapsed] = useState(false);
  // Preferência da barra lateral (desktop) lida após a hidratação; storage pode estar indisponível.
  useEffect(() => {
    try { setAgendaSidebarCollapsed(window.localStorage.getItem("agenda:sidebar-collapsed") === "1"); } catch { /* sem storage: mantém padrão */ }
  }, []);
  function toggleAgendaSidebar() {
    setAgendaSidebarCollapsed((current) => {
      try { window.localStorage.setItem("agenda:sidebar-collapsed", current ? "0" : "1"); } catch { /* preferência não persistida */ }
      return !current;
    });
  }
  const [agendaSidebarOpen, setAgendaSidebarOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const modalRef = useRef<HTMLElement | null>(null);

  useEffect(() => setEventos(initialEventos), [initialEventos]);

  useEffect(() => {
    if (!modalOpen) return;

    const dialog = modalRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const getFocusableElements = () => Array.from(dialog?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) ?? []).filter((element) => element.getClientRects().length > 0);
    const focusables = getFocusableElements();
    (dialog?.querySelector<HTMLElement>("[autofocus]") ?? focusables[0] ?? dialog)?.focus();

    const handleDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setModalOpen(false);
        return;
      }
      if (event.key !== "Tab" || !dialog) return;

      const currentFocusables = getFocusableElements();
      const first = currentFocusables[0];
      const last = currentFocusables[currentFocusables.length - 1];
      if (!first || !last) {
        event.preventDefault();
        dialog.focus();
      } else if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleDialogKeyDown);
    return () => {
      document.removeEventListener("keydown", handleDialogKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [modalOpen]);

  const filteredByType = useMemo(
    () => selectedType === "todos" ? eventos : eventos.filter((evento) => evento.tipo === selectedType),
    [eventos, selectedType]
  );
  const filteredSource = useMemo(() => {
    if (selectedMemberIds === null) return filteredByType;
    return filteredByType.filter((evento) => !evento.responsavel_id || selectedMemberIds.has(evento.responsavel_id));
  }, [filteredByType, selectedMemberIds]);
  const selectedDateParts = selectedDateKey.split("-").map(Number);
  const selectedDate = new Date(selectedDateParts[0] ?? 2000, (selectedDateParts[1] ?? 1) - 1, selectedDateParts[2] ?? 1, 12);
  const agendaMode: AgendaCalendarMode = teamMode ? "team" : view === "week" || view === "month" || view === "agenda" ? view : "day";
  const calendarEvents: CalendarEvent[] = useMemo(
    () => filteredSource.map((evento) => ({
      id: evento.id,
      title: evento.titulo,
      start: new Date(evento.inicio),
      end: evento.fim ? new Date(evento.fim) : new Date(evento.inicio),
      allDay: evento.dia_inteiro,
      resource: { tipo: evento.tipo },
    })),
    [filteredSource]
  );

  const eventCounts = EVENT_TYPES.reduce((counts, item) => {
    counts[item.value] = eventos.filter((evento) => evento.tipo === item.value).length;
    return counts;
  }, {} as Record<EventoTipo, number>);

  const eventStyleGetter = (event: CalendarEvent) => ({
    style: {
      backgroundColor: EVENT_TYPES.find((item) => item.value === event.resource.tipo)?.color ?? "#8A8D91",
      borderRadius: "7px",
      border: "none",
      color: event.resource.tipo === "audiencia" ? "#17191A" : "#FFFFFF",
      fontSize: "11px",
      fontWeight: 700,
      padding: "3px 6px",
      boxShadow: "0 4px 12px -8px rgba(23,25,26,.6)",
    },
  });

  function openCreate(start?: Date, end?: Date, responsavelId?: string | null) {
    setEditingId(null);
    setForm({ ...buildForm(null, start, end), responsavel_id: responsavelId ?? "" });
    setMessage(null);
    setModalOpen(true);
  }

  function openEdit(eventoId: string) {
    const evento = eventos.find((item) => item.id === eventoId);
    if (!evento) return;
    setEditingId(evento.id);
    setForm(buildForm(evento));
    setMessage(null);
    setModalOpen(true);
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const result = await salvarEvento({
        ...form,
        inicio: new Date(form.inicio).toISOString(),
        fim: form.fim ? new Date(form.fim).toISOString() : null,
        cliente_id: form.cliente_id || null,
        processo_id: form.processo_id || null,
        responsavel_id: form.responsavel_id || null,
      }, editingId ?? undefined);
      if ("error" in result) {
        setMessage(result.error);
        return;
      }

      const updated: EventoRaw = {
        id: result.eventoId,
        titulo: form.titulo.trim(),
        tipo: form.tipo,
        inicio: new Date(form.inicio).toISOString(),
        fim: form.fim ? new Date(form.fim).toISOString() : null,
        dia_inteiro: form.dia_inteiro,
        processo_id: form.processo_id || null,
        cliente_id: form.cliente_id || null,
        responsavel_id: form.responsavel_id || null,
        descricao: form.descricao || null,
        local: form.local || null,
        link_videoconf: form.link_videoconf || null,
      };
      setEventos((current) => current.some((item) => item.id === updated.id)
        ? current.map((item) => item.id === updated.id ? updated : item)
        : [...current, updated]);
      setModalOpen(false);
    } catch {
      setMessage("Não foi possível salvar o evento. Confira os campos e tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function removeEvent() {
    if (!editingId || !canDelete || deleting) return;
    const evento = eventos.find((item) => item.id === editingId);
    if (!window.confirm(`Excluir “${evento?.titulo ?? "este evento"}” da agenda? Esta ação não pode ser desfeita.`)) return;
    setDeleting(true);
    setMessage(null);
    try {
      const result = await excluirEvento(editingId);
      if ("error" in result) {
        setMessage(result.error);
        return;
      }
      setEventos((current) => current.filter((item) => item.id !== editingId));
      setModalOpen(false);
    } catch {
      setMessage("Não foi possível excluir o evento. Tente novamente.");
    } finally {
      setDeleting(false);
    }
  }

  const inputClass = "mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-50/60 px-3.5 py-2.5 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-gold/70 focus:bg-white focus:ring-4 focus:ring-gold/10 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:bg-zinc-900";

  function navigatePeriod(direction: -1 | 1) {
    if (agendaMode === "team" || agendaMode === "day") {
      setSelectedDateKey((current) => shiftAgendaDateKey(current, direction));
      return;
    }
    if (agendaMode === "agenda") {
      setSelectedDateKey((current) => shiftAgendaDateKey(current, direction * 30));
      return;
    }
    if (agendaMode === "week") {
      setSelectedDateKey((current) => shiftAgendaDateKey(current, direction * 7));
      return;
    }
    setSelectedDateKey((current) => shiftAgendaMonthKey(current, direction));
  }

  function goToToday() {
    setSelectedDateKey(getAgendaDateKey(new Date()));
  }

  function selectCalendarMode(nextMode: AgendaCalendarMode) {
    if (nextMode === "team") {
      setTeamMode(true);
      return;
    }
    setView(nextMode as View);
    setTeamMode(false);
  }

  function toggleMember(memberId: string) {
    setSelectedMemberIds((current) => {
      if (memberId === "__all__") {
        if (current === null || membros.every((member) => current.has(member.id))) return new Set();
        return null;
      }
      const next = current === null ? new Set(membros.map((member) => member.id)) : new Set(current);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next.size === membros.length ? null : next;
    });
  }

  function selectGridDate(dateKey: string) {
    setSelectedDateKey(dateKey);
    if (agendaMode === "week" || agendaMode === "month") {
      setView("day");
      setTeamMode(false);
    }
  }

  const closeAgendaSidebar = useCallback(() => setAgendaSidebarOpen(false), []);

  function selectSidebarDate(dateKey: string) {
    setSelectedDateKey(dateKey);
    setAgendaSidebarOpen(false);
  }

  return (
    // lg:isolate contém os z-index sticky da agenda (z-30..50) abaixo da sidebar global (z-30) quando ela expande no hover; no mobile o drawer da agenda precisa ficar acima do header.
    <div className="space-y-4 lg:isolate">
      <div className={cn("grid min-w-0 gap-3 transition-[grid-template-columns] duration-200 motion-reduce:transition-none", agendaSidebarCollapsed ? "lg:grid-cols-[minmax(0,1fr)]" : "lg:grid-cols-[260px_minmax(0,1fr)]")}>
        <AgendaSidebar
          events={filteredByType}
          members={membros}
          dateKey={selectedDateKey}
          onSelectDate={selectSidebarDate}
          onOpenEvent={openEdit}
          selectedMemberIds={selectedMemberIds}
          onToggleMember={toggleMember}
          memberSearch={memberSearch}
          onMemberSearch={setMemberSearch}
          collapsed={agendaSidebarCollapsed}
          mobileOpen={agendaSidebarOpen}
          onCloseMobile={closeAgendaSidebar}
        />

        <div className="min-w-0 space-y-3">
          <AgendaTopbar
            mode={agendaMode}
            dateKey={selectedDateKey}
            canWrite={canWrite}
            onModeChange={selectCalendarMode}
            onPrevious={() => navigatePeriod(-1)}
            onNext={() => navigatePeriod(1)}
            onToday={goToToday}
            onCreate={() => openCreate()}
            onOpenFilters={() => setAgendaSidebarOpen(true)}
            sidebarCollapsed={agendaSidebarCollapsed}
            onToggleSidebar={toggleAgendaSidebar}
            onSelectDate={setSelectedDateKey}
            selectedType={selectedType}
            eventTypeCounts={eventCounts}
            totalEventCount={eventos.length}
            onTypeChange={setSelectedType}
          />

          <section className="min-w-0 space-y-3 rounded-2xl border border-stone-200/80 bg-white p-2.5 shadow-[0_8px_24px_-20px_rgba(23,25,26,0.4)] dark:border-zinc-800 dark:bg-zinc-900 sm:p-4">
            {agendaMode === "agenda" ? (
              <div className="overflow-x-auto">
                <div className="calendar-container min-w-[620px]" style={{ height: 670 }}>
                  <Calendar<CalendarEvent>
                    localizer={localizer}
                    events={calendarEvents}
                    view="agenda"
                    date={selectedDate}
                    toolbar={false}
                    onNavigate={(date) => setSelectedDateKey(format(date, "yyyy-MM-dd"))}
                    selectable={canWrite}
                    onSelectSlot={(slot) => { if (canWrite) openCreate(new Date(slot.start), undefined); }}
                    onSelectEvent={(event) => openEdit(event.id)}
                    messages={MESSAGES}
                    culture="pt-BR"
                    eventPropGetter={eventStyleGetter}
                    style={{ fontFamily: "var(--font-inter, system-ui)" }}
                  />
                </div>
              </div>
            ) : (
              <AgendaWorkspaceViews
                mode={agendaMode}
                dateKey={selectedDateKey}
                events={filteredSource}
                members={selectedMemberIds === null ? membros : membros.filter((member) => selectedMemberIds.has(member.id))}
                clients={clientes}
                processes={processos}
                onSelectEvent={openEdit}
                onSelectDate={selectGridDate}
                onSelectTime={canWrite ? (dateKey, minuteOfDay, responsavelId) => {
                  const iso = getISOForAgendaMinute(dateKey, minuteOfDay);
                  if (iso) openCreate(new Date(iso), undefined, responsavelId);
                } : undefined}
              />
            )}
            <p className="text-[10px] text-stone-400">Clique em um horário livre para agendar ou em um evento real para abrir seus detalhes.</p>
          </section>
        </div>
      </div>

      <AnimatePresence>
        {modalOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-[#17191a]/45 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}>
          <motion.section ref={modalRef} tabIndex={-1} initial={{ opacity: 0, y: 14, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.2 }} role="dialog" aria-modal="true" aria-labelledby="evento-modal-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-stone-200 bg-[#fcfcfb] p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 sm:rounded-3xl sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#17191a] text-gold dark:bg-zinc-800"><CalendarDays className="h-5 w-5" aria-hidden="true" /></span><div><h2 id="evento-modal-title" className="text-base font-black text-[#17191a] dark:text-zinc-100">{editingId ? "Detalhes do evento" : "Novo evento"}</h2><p className="mt-0.5 text-xs text-stone-400 dark:text-zinc-400">Adicione as informações para a equipe</p></div></div>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200" aria-label="Fechar formulário"><X className="h-4 w-4" aria-hidden="true" /></button>
            </div>

            <form onSubmit={submit}>
              <fieldset disabled={!canWrite} className="space-y-4">
              <label className="block text-xs font-semibold text-stone-600">Título <span className="text-gold-dark">*</span><input autoFocus required value={form.titulo} onChange={(event) => update("titulo", event.target.value)} placeholder="Ex.: Audiência de instrução" className={inputClass} /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold text-stone-600">Tipo de evento<select value={form.tipo} onChange={(event) => update("tipo", event.target.value as EventoTipo)} className={inputClass}>{EVENT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-stone-600 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300"><input type="checkbox" checked={form.dia_inteiro} onChange={(event) => update("dia_inteiro", event.target.checked)} className="h-4 w-4 accent-[#D4AF37]" />Evento de dia inteiro</label>
                <DatePicker label="Início" required includeTime value={form.inicio} onChange={(value) => update("inicio", value)} inputClassName="bg-stone-50/60" />
                <DatePicker label="Término" includeTime min={form.inicio || undefined} value={form.fim} onChange={(value) => update("fim", value)} inputClassName="bg-stone-50/60" />
                <label className="text-xs font-semibold text-stone-600">Cliente<select value={form.cliente_id} onChange={(event) => update("cliente_id", event.target.value)} className={inputClass}><option value="">Sem cliente vinculado</option>{clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>)}</select></label>
                <label className="text-xs font-semibold text-stone-600">Processo<select value={form.processo_id} onChange={(event) => update("processo_id", event.target.value)} className={inputClass}><option value="">Sem processo vinculado</option>{processos.map((processo) => <option key={processo.id} value={processo.id}>{processo.numero_cnj || processo.tipo_acao || "Processo"}</option>)}</select></label>
                <label className="text-xs font-semibold text-stone-600">Responsável<select value={form.responsavel_id} onChange={(event) => update("responsavel_id", event.target.value)} className={inputClass}><option value="">Sem responsável definido</option>{membros.map((membro) => <option key={membro.id} value={membro.id} disabled={!membro.ativo && form.responsavel_id !== membro.id}>{membro.nome}{membro.ativo ? "" : " · inativo"}</option>)}</select></label>
                <label className="text-xs font-semibold text-stone-600 sm:col-span-2">Local<input value={form.local} onChange={(event) => update("local", event.target.value)} placeholder="Endereço ou sala" className={inputClass} /></label>
                <label className="text-xs font-semibold text-stone-600 sm:col-span-2">Link de videoconferência<input type="url" value={form.link_videoconf} onChange={(event) => update("link_videoconf", event.target.value)} placeholder="https://..." className={inputClass} /></label>
                <label className="text-xs font-semibold text-stone-600 sm:col-span-2">Observações<textarea rows={3} value={form.descricao} onChange={(event) => update("descricao", event.target.value)} placeholder="Pauta, orientações e documentos necessários..." className={cn(inputClass, "resize-y")} /></label>
              </div>
              </fieldset>

              {message && <p role="status" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">{message}</p>}
              <div className="flex flex-col-reverse gap-2 border-t border-stone-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                {editingId && canDelete ? <button type="button" onClick={removeEvent} disabled={deleting || saving} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 px-4 text-xs font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/10"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" />{deleting ? "Excluindo..." : "Excluir evento"}</button> : <span />}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => setModalOpen(false)} className="inline-flex h-10 items-center justify-center rounded-xl border border-stone-200 bg-white px-4 text-xs font-bold text-stone-600 transition hover:bg-stone-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">Cancelar</button>
                  {canWrite && <button type="submit" disabled={saving || deleting} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gold px-4 text-xs font-bold text-white transition hover:bg-gold-hover disabled:opacity-50">{saving ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" /> : <Save className="h-3.5 w-3.5" aria-hidden="true" />}{saving ? "Salvando..." : editingId ? "Salvar alterações" : "Salvar evento"}</button>}
                </div>
              </div>
            </form>
          </motion.section>
        </motion.div>}
      </AnimatePresence>

      <style jsx global>{`
        .rbc-calendar { color: #343637; font-size: 12px; }
        .rbc-toolbar { gap: 8px; margin-bottom: 18px; }
        .rbc-toolbar-label { color: #17191a; font-size: 16px; font-weight: 800; text-align: left; }
        .rbc-toolbar button { border: 1px solid #e7e5e4; border-radius: 10px; color: #57534e; font-size: 11px; font-weight: 700; padding: 7px 10px; transition: all .18s ease; }
        .rbc-toolbar button:hover, .rbc-toolbar button.rbc-active { background: #fbf6e9; border-color: #d4af37; color: #8a6b12; box-shadow: none; }
        .rbc-toolbar button:focus { background: #fbf6e9; border-color: #d4af37; color: #8a6b12; }
        .rbc-header { border-bottom: 1px solid #f1efeb; color: #a8a29e; font-size: 10px; font-weight: 800; padding: 9px 3px; text-transform: uppercase; letter-spacing: .08em; }
        .rbc-month-view, .rbc-time-view, .rbc-agenda-view { border: 1px solid #f0eeeb; border-radius: 14px; overflow: hidden; }
        .rbc-day-bg + .rbc-day-bg, .rbc-month-row + .rbc-month-row, .rbc-time-header-content, .rbc-time-content > * + * > * { border-color: #f1efeb; }
        .rbc-off-range-bg { background: #faf9f7; }
        .rbc-today { background: #fcf8e9; }
        .rbc-date-cell { color: #78716c; font-size: 10px; padding: 5px 6px; }
        .rbc-date-cell.rbc-now { color: #8a6b12; font-weight: 900; }
        .rbc-show-more { color: #8a6b12; font-size: 10px; font-weight: 700; }
        .rbc-time-slot { color: #a8a29e; font-size: 9px; }
        .rbc-current-time-indicator { background-color: #d4af37; }
        .rbc-agenda-date-cell, .rbc-agenda-time-cell { color: #78716c; font-size: 11px; }
        html.dark .rbc-calendar { color: #e4e4e7; }
        html.dark .rbc-toolbar-label { color: #f4f4f5; }
        html.dark .rbc-toolbar button { border-color: #3f3f46; color: #d4d4d8; background: #18181b; }
        html.dark .rbc-toolbar button:hover, html.dark .rbc-toolbar button.rbc-active, html.dark .rbc-toolbar button:focus { background: rgba(212, 175, 55, 0.15); border-color: #d4af37; color: #f3d06a; }
        html.dark .rbc-header { border-bottom-color: #27272a; color: #a1a1aa; }
        html.dark .rbc-month-view, html.dark .rbc-time-view, html.dark .rbc-agenda-view, html.dark .rbc-agenda-view table.rbc-agenda-table { border-color: #27272a; }
        html.dark .rbc-day-bg + .rbc-day-bg, html.dark .rbc-month-row + .rbc-month-row, html.dark .rbc-time-header-content, html.dark .rbc-time-content > * + * > *, html.dark .rbc-agenda-view table.rbc-agenda-table tbody > tr > td + td, html.dark .rbc-agenda-view table.rbc-agenda-table tbody > tr + tr { border-color: #27272a; }
        html.dark .rbc-off-range-bg { background: #141618; }
        html.dark .rbc-today { background: rgba(212, 175, 55, 0.08); }
        html.dark .rbc-date-cell { color: #a1a1aa; }
        html.dark .rbc-date-cell.rbc-now, html.dark .rbc-show-more { color: #f3d06a; }
        html.dark .rbc-time-slot, html.dark .rbc-agenda-date-cell, html.dark .rbc-agenda-time-cell { color: #a1a1aa; }
        @media (max-width: 640px) { .rbc-toolbar { align-items: stretch; flex-wrap: wrap; } .rbc-toolbar-label { order: -1; width: 100%; } .rbc-btn-group { display: flex; } .rbc-toolbar button { padding: 6px 7px; } }
      `}</style>
    </div>
  );
}
