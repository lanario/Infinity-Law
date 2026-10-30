"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Menu,
  PanelLeft,
  Plus,
  Search,
  X,
} from "lucide-react";
import { motion, useReducedMotion, useReducedMotionConfig } from "framer-motion";
import { ProfileAvatar } from "@/components/layout/profile-avatar";
import { cn } from "@/lib/utils";
import {
  formatAgendaDateLabel,
  formatAgendaTime,
  getAgendaDateKey,
  getAgendaMinuteOfDay,
  getAgendaTimelineRange,
  getEventIntervalForAgendaDay,
  shiftAgendaDateKey,
  shiftAgendaMonthKey,
} from "@/lib/agenda/team-timeline.mjs";
import {
  countAgendaEventsByDate,
  getAgendaMonthGridDateKeys,
  getAgendaWeekDateKeys,
  layoutAgendaEventsInColumns,
} from "@/lib/agenda/calendar-layout.mjs";
import { TeamDayTimeline } from "@/components/agenda/team-day-timeline";
import { AgendaWeekStrip } from "@/components/agenda/agenda-week-strip";
import { getMemberColor, memberTint } from "@/components/agenda/member-colors";
import { SlotPreview, SlotPreviewBody, snapMinuteFromOffset } from "@/components/agenda/slot-hover-preview";
import { StatusFilterSelect } from "@/components/ui/status-filter-select";

export type AgendaCalendarMode = "day" | "week" | "month" | "team" | "agenda";
export type AgendaTipo = "audiencia" | "reuniao" | "prazo" | "compromisso";
export type AgendaEventTypeFilter = AgendaTipo | "todos";
export type AgendaEvent = {
  id: string;
  titulo: string;
  tipo: AgendaTipo;
  inicio: string;
  fim: string | null;
  dia_inteiro: boolean;
  processo_id: string | null;
  cliente_id: string | null;
  responsavel_id: string | null;
  descricao?: string | null;
  local?: string | null;
  link_videoconf?: string | null;
};
const isAvatarUrl = (value: string | null) => Boolean(value && /^https?:\/\//i.test(value));

export type AgendaMember = { id: string; nome: string; avatar_url: string | null; ativo: boolean };
export type AgendaClientOption = { id: string; nome: string };
export type AgendaProcessOption = { id: string; numero_cnj: string | null; tipo_acao: string | null };

const TYPE_STYLE: Record<AgendaTipo, { label: string; dot: string; card: string; bar: string }> = {
  audiencia: { label: "Audiência", dot: "bg-gold", card: "border-gold/45 bg-gold-soft text-[#80600b] dark:border-gold/40 dark:bg-gold/15 dark:text-[#f3d06a]", bar: "bg-gold" },
  reuniao: { label: "Reunião", dot: "bg-[#303334] dark:bg-zinc-300", card: "border-stone-300 bg-stone-200/75 text-[#303334] dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100", bar: "bg-[#303334] dark:bg-zinc-300" },
  prazo: { label: "Prazo", dot: "bg-rose-500", card: "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-500/40 dark:bg-rose-950/70 dark:text-rose-200", bar: "bg-rose-500" },
  compromisso: { label: "Compromisso", dot: "bg-sky-500", card: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/40 dark:bg-sky-950/70 dark:text-sky-200", bar: "bg-sky-500" },
};

const WEEKDAY_SHORT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const HALF_HOUR_HEIGHT = 44;

function dateKeyParts(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return { year, month, day };
}

function formatTime(minute: number) {
  if (minute >= 24 * 60) return "24:00";
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

function formatEventTime(event: AgendaEvent) {
  if (event.dia_inteiro) return "Dia inteiro";
  const start = formatAgendaTime(event.inicio);
  const end = event.fim ? formatAgendaTime(event.fim) : "";
  return end ? `${start}–${end}` : start;
}

function eventDetails(
  event: AgendaEvent,
  clientById: Map<string, string>,
  processById: Map<string, AgendaProcessOption>,
  memberById: Map<string, AgendaMember>,
) {
  const clientName = event.cliente_id ? clientById.get(event.cliente_id) : null;
  const process = event.processo_id ? processById.get(event.processo_id) : null;
  const memberName = event.responsavel_id ? memberById.get(event.responsavel_id)?.nome : null;
  return [
    TYPE_STYLE[event.tipo].label,
    clientName,
    process ? process.numero_cnj || process.tipo_acao : null,
    memberName,
  ].filter(Boolean).join(" · ");
}

function EventCard({
  event,
  clientById,
  processById,
  memberById,
  onSelect,
  className,
  style,
}: {
  event: AgendaEvent;
  clientById: Map<string, string>;
  processById: Map<string, AgendaProcessOption>;
  memberById: Map<string, AgendaMember>;
  onSelect: (id: string) => void;
  className?: string;
  style?: CSSProperties;
}) {
  const details = eventDetails(event, clientById, processById, memberById);
  return (
    <button
      type="button"
      onClick={() => onSelect(event.id)}
      title={`${event.titulo} · ${formatEventTime(event)}${details ? ` · ${details}` : ""}`}
      aria-label={`Abrir evento ${event.titulo}. ${formatEventTime(event)}${details ? `. ${details}` : ""}`}
      style={style}
      className={cn("min-w-0 rounded-lg border px-2.5 py-2 text-left shadow-[0_2px_8px_-6px_rgba(23,25,26,.45)] transition hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-1", TYPE_STYLE[event.tipo].card, className)}
    >
      <span className="block truncate text-[11px] font-bold leading-4">{event.titulo}</span>
      <span className="mt-0.5 block truncate text-[10px] font-medium opacity-80">{formatEventTime(event)}{details ? ` · ${details}` : ""}</span>
    </button>
  );
}

function MiniCalendar({
  monthDateKey,
  selectedDateKey,
  eventCounts,
  onSelect,
  onMonthChange,
}: {
  monthDateKey: string;
  selectedDateKey: string;
  eventCounts: Map<string, number>;
  onSelect: (dateKey: string) => void;
  onMonthChange: (direction: -1 | 1) => void;
}) {
  const dates = getAgendaMonthGridDateKeys(monthDateKey);
  const selectedMonth = monthDateKey.slice(0, 7);
  const reducedMotionConfig = useReducedMotionConfig();
  const prefersReducedMotion = useReducedMotion();
  const shouldReduceMotion = reducedMotionConfig === true || prefersReducedMotion === true;
  return (
    <section aria-label="Calendário mensal" className="rounded-2xl border border-stone-200 bg-white p-3 shadow-[0_6px_18px_-18px_rgba(23,25,26,.45)]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="truncate text-xs font-extrabold capitalize text-[#303334] dark:text-zinc-100">{formatAgendaDateLabel(`${selectedMonth}-01`, { month: "long", year: "numeric" })}</h3>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onMonthChange(-1)} aria-label="Mês anterior no mini calendário" className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-500 transition hover:bg-gold-soft hover:text-gold-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold dark:text-zinc-400 dark:hover:bg-gold/15 dark:hover:text-gold"><ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" /></button>
          <button type="button" onClick={() => onMonthChange(1)} aria-label="Próximo mês no mini calendário" className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-500 transition hover:bg-gold-soft hover:text-gold-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold dark:text-zinc-400 dark:hover:bg-gold/15 dark:hover:text-gold"><ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAY_SHORT.map((weekday) => <span key={weekday} className="py-1 text-[9px] font-bold uppercase text-stone-400">{weekday.slice(0, 1)}</span>)}
        {dates.map((dateKey) => {
          const parts = dateKeyParts(dateKey);
          const count = eventCounts.get(dateKey) ?? 0;
          const inMonth = dateKey.slice(0, 7) === selectedMonth;
          const isSelected = dateKey === selectedDateKey;
          const isToday = dateKey === getAgendaDateKey(new Date());
          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onSelect(dateKey)}
              aria-label={`${formatAgendaDateLabel(dateKey)}${count ? `, ${count} ${count === 1 ? "evento" : "eventos"}` : ""}`}
              aria-pressed={isSelected}
              className={cn("relative isolate mx-auto flex h-8 w-8 items-center justify-center rounded-full text-[10px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold", !inMonth && "text-stone-300 dark:text-zinc-600", inMonth && !isSelected && "text-stone-600 hover:bg-gold-soft dark:text-zinc-300 dark:hover:bg-gold/15", isSelected && "font-extrabold text-white dark:text-neutral-950", !isSelected && isToday && "ring-1 ring-gold text-gold-dark dark:text-gold", count > 0 && !isSelected && "font-bold")}
            >
              {isSelected && (
                <motion.span
                  aria-hidden="true"
                  layoutId={shouldReduceMotion ? undefined : "agenda-mini-calendar-selection"}
                  transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 42 }}
                  className="absolute inset-0 z-0 rounded-full bg-[#17191a] dark:bg-gold"
                />
              )}
              <span className="relative z-10">{parts.day}</span>
              {count > 0 && <span className={cn("absolute bottom-0.5 left-1/2 z-20 h-1 w-1 -translate-x-1/2 rounded-full", isSelected ? "bg-gold dark:bg-neutral-950" : "bg-gold-dark dark:bg-gold")} aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function MembersFilter({
  members,
  events,
  search,
  onSearch,
  onClearSearch,
  onToggleAll,
  selectedMemberIds,
  onToggle,
}: {
  members: AgendaMember[];
  events: AgendaEvent[];
  search: string;
  onSearch: (value: string) => void;
  onClearSearch: () => void;
  onToggleAll: () => void;
  selectedMemberIds: Set<string> | null;
  onToggle: (id: string) => void;
}) {
  const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
  const visibleMembers = members.filter((member) => member.nome.toLocaleLowerCase("pt-BR").includes(normalizedSearch));
  const allSelected = selectedMemberIds === null || members.every((member) => selectedMemberIds.has(member.id));

  return (
    <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_6px_18px_-18px_rgba(23,25,26,.45)]">
      <div className="flex items-center justify-between gap-2 border-b border-stone-100 px-3 py-2.5">
        <div><h3 className="text-xs font-extrabold text-[#303334] dark:text-zinc-100">Responsáveis</h3><p className="mt-0.5 text-[10px] text-stone-400 dark:text-zinc-400">{selectedMemberIds === null ? "Todos selecionados" : `${selectedMemberIds.size} de ${members.length} selecionados`}</p></div>
        {search && <button type="button" onClick={onClearSearch} aria-label="Limpar pesquisa de responsáveis" className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-50 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>}
      </div>
      <label className="relative block border-b border-stone-100 px-3 py-2.5">
        <Search className="pointer-events-none absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" aria-hidden="true" />
        <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Buscar responsável" aria-label="Buscar responsáveis do escritório" className="w-full rounded-lg border border-stone-200 bg-stone-50 py-2 pl-8 pr-2 text-[11px] text-stone-700 outline-none transition placeholder:text-stone-400 focus:border-gold/70 focus:bg-white focus:ring-2 focus:ring-gold/10" />
      </label>
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-[10px] text-stone-500">Exibir equipe</span>
        <button type="button" onClick={onToggleAll} className="text-[10px] font-bold text-gold-dark underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold dark:text-gold" aria-label={allSelected ? "Desmarcar todos os responsáveis" : "Selecionar todos os responsáveis"}>{allSelected ? "Limpar" : "Todos"}</button>
      </div>
      <ul className="max-h-56 space-y-0.5 overflow-y-auto px-2 pb-2">
        {visibleMembers.map((member) => {
          const count = events.filter((event) => event.responsavel_id === member.id).length;
          const checked = selectedMemberIds === null || selectedMemberIds.has(member.id);
          return (
            <li key={member.id}>
              <label className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-2 text-[11px] text-stone-700 transition hover:bg-stone-50">
                <input type="checkbox" checked={checked} onChange={() => onToggle(member.id)} style={{ accentColor: getMemberColor(member.id) }} className="h-3.5 w-3.5 rounded border-stone-300 focus-visible:ring-gold" />
                <ProfileAvatar path={isAvatarUrl(member.avatar_url) ? null : member.avatar_url} url={isAvatarUrl(member.avatar_url) ? member.avatar_url : null} initials={member.nome.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase("pt-BR") ?? "").join("")} name={member.nome} className="h-7 w-7 border border-stone-200 !bg-gold-soft !text-gold-dark dark:border-zinc-700 dark:!bg-gold/15 dark:!text-gold text-[9px]" />
                <span className="min-w-0 flex-1 truncate font-semibold">{member.nome}{!member.ativo && <span className="ml-1 text-[9px] font-medium text-stone-400">(inativo)</span>}</span>
                <span className="rounded-full bg-stone-100 px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-stone-500">{count}</span>
              </label>
            </li>
          );
        })}
        {visibleMembers.length === 0 && <li className="px-2 py-3 text-center text-[10px] text-stone-400">Nenhum responsável encontrado.</li>}
      </ul>
    </section>
  );
}

function timeRangeForDates(events: AgendaEvent[], dateKeys: string[]) {
  const intervals = dateKeys.flatMap((dateKey) => events.map((event) => getEventIntervalForAgendaDay(event, dateKey)).filter(Boolean));
  return getAgendaTimelineRange(intervals);
}

function AgendaDayGrid({
  dateKey,
  events,
  members,
  clients,
  processes,
  onSelectEvent,
  onSelectTime,
}: {
  dateKey: string;
  events: AgendaEvent[];
  members: AgendaMember[];
  clients: AgendaClientOption[];
  processes: AgendaProcessOption[];
  onSelectEvent: (id: string) => void;
  onSelectTime?: (dateKey: string, minute: number, responsavelId: string | null) => void;
}) {
  const memberById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);
  const clientById = useMemo(() => new Map(clients.map((client) => [client.id, client.nome])), [clients]);
  const processById = useMemo(() => new Map(processes.map((process) => [process.id, process])), [processes]);
  const membersWithEvents = members.filter((member) => events.some((event) => event.responsavel_id === member.id));
  const lanes = [
    ...members.filter((member) => member.ativo || membersWithEvents.some((candidate) => candidate.id === member.id)).map((member) => ({ id: member.id, name: member.nome, member })),
    ...(events.some((event) => !event.responsavel_id || !memberById.has(event.responsavel_id)) || members.length === 0 ? [{ id: "unassigned", name: "Sem responsável", member: null }] : []),
  ];
  const visibleLanes = lanes.length ? lanes : [{ id: "unassigned", name: "Sem responsável", member: null }];
  const timedEvents = events.filter((event) => !event.dia_inteiro);
  const range = timeRangeForDates(timedEvents, [dateKey]);
  const duration = range.endMinute - range.startMinute;
  const gridHeight = (duration / 30) * HALF_HOUR_HEIGHT;
  const now = new Date();
  const currentMinute = getAgendaDateKey(now) === dateKey ? getAgendaMinuteOfDay(now) : null;
  const currentTop = currentMinute === null ? null : ((currentMinute - range.startMinute) / 30) * HALF_HOUR_HEIGHT;
  const slotMinutes = Array.from({ length: Math.ceil(duration / 30) }, (_, index) => range.startMinute + index * 30);

  return (
    <section aria-label={`Agenda diária de ${formatAgendaDateLabel(dateKey)}`} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_8px_24px_-20px_rgba(23,25,26,.4)]">
      <div className="max-h-[72vh] overflow-auto overscroll-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold" tabIndex={0} aria-label="Agenda do dia. Use a rolagem horizontal para consultar responsáveis e vertical para os horários.">
        <div className="grid min-w-max" style={{ gridTemplateColumns: `70px repeat(${visibleLanes.length}, minmax(218px, 1fr))` }}>
          <div className="sticky left-0 top-0 z-40 flex h-[62px] items-center justify-center border-b border-r border-stone-200 bg-stone-50 text-[10px] font-bold uppercase tracking-wide text-stone-400">Hora</div>
          {visibleLanes.map((lane) => <div key={lane.id} style={{ borderTop: `3px solid ${getMemberColor(lane.member?.id ?? null)}` }} className="sticky top-0 z-30 flex h-[62px] min-w-0 items-center justify-center border-b border-r border-stone-200 bg-white px-3 text-center"><div className="min-w-0"><p className="truncate text-xs font-extrabold text-[#303334] dark:text-zinc-100">{lane.name}</p><p className="mt-0.5 text-[10px] text-stone-400 dark:text-zinc-400">Eventos: {events.filter((event) => lane.member ? event.responsavel_id === lane.member.id : !event.responsavel_id || !memberById.has(event.responsavel_id)).length}</p></div></div>)}
          <div className="sticky left-0 z-20 border-r border-stone-200 bg-white" style={{ height: gridHeight }}>
            {range.ticks.filter((tick) => tick.minute < range.endMinute).map((tick) => <span key={tick.minute} className={cn("absolute left-0 w-full pr-2 text-right text-[10px] font-semibold tabular-nums text-stone-500", tick.minute !== range.startMinute && "-translate-y-1/2")} style={{ top: ((tick.minute - range.startMinute) / 30) * HALF_HOUR_HEIGHT }}>{tick.label}</span>)}
          </div>
          {visibleLanes.map((lane) => {
            const laneEvents = timedEvents.filter((event) => lane.member ? event.responsavel_id === lane.member.id : !event.responsavel_id || !memberById.has(event.responsavel_id));
            const placed = layoutAgendaEventsInColumns(laneEvents, dateKey);
            return (
              <div key={lane.id} className="relative border-r border-stone-100" style={{ height: gridHeight, backgroundColor: memberTint(getMemberColor(lane.member?.id ?? null)), backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent 43px, rgba(120, 113, 108, 0.16) 43px, rgba(120, 113, 108, 0.16) 44px)", backgroundSize: "100% 44px" }}>
                {slotMinutes.map((minute) => <button key={minute} type="button" disabled={!onSelectTime || minute >= 24 * 60} aria-label={`Criar evento para ${lane.name} às ${formatTime(minute)}`} onClick={() => onSelectTime?.(dateKey, minute, lane.member?.id ?? null)} className="group absolute inset-x-0 z-0 h-[44px] cursor-pointer border-0 bg-transparent p-0 text-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold disabled:cursor-default" style={{ top: ((minute - range.startMinute) / 30) * HALF_HOUR_HEIGHT }}>
                  {/* Preview só com mouse (hover:hover) ou foco de teclado; eventos ficam acima e cancelam o hover */}
                  {onSelectTime && <span aria-hidden="true" className="pointer-events-none absolute inset-x-0.5 inset-y-px hidden flex-col items-center justify-center overflow-hidden rounded-md border border-gold/50 bg-gold/15 text-gold-dark dark:text-gold group-focus-visible:flex [@media(hover:hover)]:group-hover:flex"><SlotPreviewBody minute={minute} /></span>}
                </button>)}
                {currentTop !== null && currentTop >= 0 && currentTop <= gridHeight && <span aria-hidden="true" className="pointer-events-none absolute left-0 right-0 z-10 h-0.5 -translate-y-1/2 bg-gold" style={{ top: currentTop }}><span className="absolute left-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-gold" /></span>}
                {placed.map(({ event, startMinute, endMinute, column, columns }) => {
                  const top = ((startMinute - range.startMinute) / 30) * HALF_HOUR_HEIGHT + 2;
                  const height = Math.max(42, ((endMinute - startMinute) / 30) * HALF_HOUR_HEIGHT - 4);
                  return <EventCard key={event.id} event={event} clientById={clientById} processById={processById} memberById={memberById} onSelect={onSelectEvent} className="absolute z-20 overflow-hidden" style={{ top, height, left: `calc(${(column / columns) * 100}% + 2px)`, width: `calc(${100 / columns}% - 4px)` }} />;
                })}
              </div>
            );
          })}
        </div>
      </div>
      {events.filter((event) => event.dia_inteiro && getEventIntervalForAgendaDay(event, dateKey)).length > 0 && <div className="border-t border-stone-100 bg-stone-50/70 px-3 py-2"><p className="mb-1 text-[9px] font-extrabold uppercase tracking-wide text-stone-400">Dia inteiro</p><div className="flex flex-wrap gap-2">{events.filter((event) => event.dia_inteiro && getEventIntervalForAgendaDay(event, dateKey)).map((event) => <EventCard key={event.id} event={event} clientById={clientById} processById={processById} memberById={memberById} onSelect={onSelectEvent} className="max-w-sm" />)}</div></div>}
      <p className="sr-only" aria-live="polite">{events.length} eventos reais na data selecionada.</p>
    </section>
  );
}

function AgendaWeekGrid({
  dateKey,
  events,
  members,
  clients,
  processes,
  onSelectDate,
  onSelectEvent,
  onSelectTime,
}: {
  dateKey: string;
  events: AgendaEvent[];
  members: AgendaMember[];
  clients: AgendaClientOption[];
  processes: AgendaProcessOption[];
  onSelectDate: (dateKey: string) => void;
  onSelectEvent: (id: string) => void;
  onSelectTime?: (dateKey: string, minute: number, responsavelId: string | null) => void;
}) {
  const dateKeys = getAgendaWeekDateKeys(dateKey);
  const memberById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);
  const clientById = useMemo(() => new Map(clients.map((client) => [client.id, client.nome])), [clients]);
  const processById = useMemo(() => new Map(processes.map((process) => [process.id, process])), [processes]);
  const activeMembers = members.filter((member) => member.ativo || events.some((event) => event.responsavel_id === member.id));
  const hasUnassigned = events.some((event) => !event.responsavel_id || !memberById.has(event.responsavel_id));
  const owners = [...activeMembers.map((member) => ({ id: member.id, name: member.nome, member })), ...(hasUnassigned || activeMembers.length === 0 ? [{ id: "unassigned", name: "Sem responsável", member: null }] : [])];
  const columnsPerDay = Math.max(1, owners.length);
  const timedEvents = events.filter((event) => !event.dia_inteiro);
  const gridRange = timeRangeForDates(timedEvents, dateKeys);
  const gridHeight = ((gridRange.endMinute - gridRange.startMinute) / 30) * HALF_HOUR_HEIGHT;
  const slotMinutes = Array.from({ length: Math.ceil((gridRange.endMinute - gridRange.startMinute) / 30) }, (_, index) => gridRange.startMinute + index * 30);
  const [slotHover, setSlotHover] = useState<{ key: string; minute: number } | null>(null);

  const weekdayHeader = dateKeys.map((date, index) => {
    const dayEvents = events.filter((event) => getEventIntervalForAgendaDay(event, date));
    return <div key={date} style={{ gridColumn: `span ${columnsPerDay}` }} className={cn("sticky top-0 z-30 flex h-[60px] min-w-0 items-center justify-center border-b border-r border-stone-200 bg-white px-2 text-center", date === getAgendaDateKey(new Date()) && "bg-gold-soft/60 dark:bg-gold/10")}>
      <button type="button" onClick={() => onSelectDate(date)} aria-label={`Abrir agenda de ${formatAgendaDateLabel(date)}`} className="rounded-lg px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"><span className="block text-[9px] font-extrabold uppercase tracking-wide text-stone-400">{WEEKDAY_SHORT[index]} · {date.slice(8, 10)}</span><span className="mt-0.5 block text-[10px] text-stone-500">{dayEvents.length} {dayEvents.length === 1 ? "evento" : "eventos"}</span></button>
    </div>;
  });

  return (
    <section aria-label="Agenda semanal" className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_8px_24px_-20px_rgba(23,25,26,.4)]">
      <div className="hidden max-h-[72vh] overflow-auto overscroll-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold md:block" tabIndex={0} aria-label="Agenda semanal. Use a rolagem horizontal para consultar dias e responsáveis.">
        <div className="grid min-w-max" style={{ gridTemplateColumns: `66px repeat(${dateKeys.length * columnsPerDay}, minmax(150px, 1fr))` }}>
          <div className="sticky left-0 top-0 z-40 h-[60px] border-b border-r border-stone-200 bg-stone-50" />
          {weekdayHeader}
          <div className="sticky left-0 z-20 border-r border-b border-stone-200 bg-stone-50 px-1 py-2 text-[8px] font-bold uppercase text-stone-400" />
          {dateKeys.flatMap((dayKey) => owners.map((owner) => <div key={`owner-${dayKey}-${owner.id}`} className="sticky top-[60px] z-20 min-w-[150px] truncate border-b border-r border-stone-200 bg-stone-50 px-2 py-1.5 text-center text-[9px] font-semibold text-stone-500" title={owner.name}>{owner.name}</div>))}
          <div className="sticky left-0 z-20 flex items-center justify-center border-r border-b border-stone-200 bg-stone-50 px-1 text-[8px] font-bold uppercase text-stone-400">Dia todo</div>
          {dateKeys.flatMap((dayKey) => owners.map((owner) => {
            const allDayEvents = events.filter((event) => event.dia_inteiro && getEventIntervalForAgendaDay(event, dayKey) && (owner.member ? event.responsavel_id === owner.member.id : !event.responsavel_id || !memberById.has(event.responsavel_id)));
            return <div key={`all-day-${dayKey}-${owner.id}`} className="min-w-[150px] border-b border-r border-stone-100 bg-white p-1">{allDayEvents.slice(0, 2).map((event) => <button key={event.id} type="button" onClick={() => onSelectEvent(event.id)} title={event.titulo} aria-label={`Abrir evento de dia inteiro ${event.titulo}`} className={cn("block w-full truncate rounded border px-1 py-1 text-left text-[8px] font-semibold", TYPE_STYLE[event.tipo].card)}>{event.titulo}</button>)}{allDayEvents.length > 2 && <span className="block px-1 text-[9px] font-semibold text-stone-500">+{allDayEvents.length - 2} mais</span>}</div>;
          }))}
          <div className="sticky left-0 z-20 border-r border-stone-200 bg-white" style={{ height: gridHeight }}>{gridRange.ticks.filter((tick) => tick.minute < gridRange.endMinute).map((tick) => <span key={tick.minute} className={cn("absolute left-0 w-full pr-2 text-right text-[9px] font-semibold tabular-nums text-stone-500", tick.minute !== gridRange.startMinute && "-translate-y-1/2")} style={{ top: ((tick.minute - gridRange.startMinute) / 30) * HALF_HOUR_HEIGHT }}>{tick.label}</span>)}</div>
          {dateKeys.flatMap((dayKey) => owners.map((owner) => {
            const ownerEvents = timedEvents.filter((event) => {
              const interval = getEventIntervalForAgendaDay(event, dayKey);
              const belongs = owner.member ? event.responsavel_id === owner.member.id : !event.responsavel_id || !memberById.has(event.responsavel_id);
              return interval && belongs;
            });
            const placed = layoutAgendaEventsInColumns(ownerEvents, dayKey);
            return <div key={`${dayKey}-${owner.id}`} className="relative min-w-[150px] border-r border-stone-100" style={{ height: gridHeight, backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent 43px, rgba(120, 113, 108, 0.16) 43px, rgba(120, 113, 108, 0.16) 44px)", backgroundSize: "100% 44px" }}>
              <button type="button" disabled={!onSelectTime} aria-label={`Criar evento para ${owner.name} em ${formatAgendaDateLabel(dayKey)}`} onClick={(event) => {
                const bounds = event.currentTarget.getBoundingClientRect();
                const y = event.detail === 0 ? bounds.height / 2 : event.clientY - bounds.top;
                onSelectTime?.(dayKey, snapMinuteFromOffset(y, bounds.height, gridRange.startMinute, gridRange.endMinute), owner.member?.id ?? null);
              }} onPointerMove={(event) => {
                if (event.pointerType === "touch" || !onSelectTime) return;
                const bounds = event.currentTarget.getBoundingClientRect();
                const minute = snapMinuteFromOffset(event.clientY - bounds.top, bounds.height, gridRange.startMinute, gridRange.endMinute);
                const key = `${dayKey}-${owner.id}`;
                setSlotHover((current) => current?.key === key && current.minute === minute ? current : { key, minute });
              }} onPointerLeave={() => setSlotHover(null)} className="absolute inset-0 z-0 cursor-crosshair bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold disabled:cursor-default" />
              {slotHover?.key === `${dayKey}-${owner.id}` && <SlotPreview minute={slotHover.minute} className="inset-x-0.5" style={{ top: ((slotHover.minute - gridRange.startMinute) / 30) * HALF_HOUR_HEIGHT, height: HALF_HOUR_HEIGHT }} />}
              {slotMinutes.filter((minute) => minute % 60 === 0).map((minute) => <span key={minute} className="pointer-events-none absolute left-0 right-0 z-[1] border-t border-dashed border-stone-200/80" style={{ top: ((minute - gridRange.startMinute) / 30) * HALF_HOUR_HEIGHT }} aria-hidden="true" />)}
              {placed.map(({ event, startMinute, endMinute, column, columns }) => <EventCard key={event.id} event={event} clientById={clientById} processById={processById} memberById={memberById} onSelect={onSelectEvent} className="absolute z-10 overflow-hidden rounded-md p-1.5" style={{ top: ((startMinute - gridRange.startMinute) / 30) * HALF_HOUR_HEIGHT + 2, height: Math.max(42, ((endMinute - startMinute) / 30) * HALF_HOUR_HEIGHT - 4), left: `calc(${(column / columns) * 100}% + 2px)`, width: `calc(${100 / columns}% - 4px)` }} />)}
            </div>;
          }))}
        </div>
      </div>
      <div className="md:hidden">
        <div className="flex items-center justify-between border-b border-stone-100 px-3 py-2"><p className="text-[10px] text-stone-500">Semana em telas pequenas · exibindo o dia selecionado</p><span className="text-[10px] font-bold text-gold-dark dark:text-gold">{formatAgendaDateLabel(dateKey, { weekday: "short", day: "numeric" })}</span></div>
        <AgendaDayGrid dateKey={dateKey} events={events} members={members} clients={clients} processes={processes} onSelectEvent={onSelectEvent} onSelectTime={onSelectTime} />
      </div>
      <p className="sr-only" aria-live="polite">Semana com {events.length} eventos reais.</p>
    </section>
  );
}

function AgendaMonthGrid({
  dateKey,
  events,
  clients,
  processes,
  members,
  onSelectDate,
  onSelectEvent,
}: {
  dateKey: string;
  events: AgendaEvent[];
  clients: AgendaClientOption[];
  processes: AgendaProcessOption[];
  members: AgendaMember[];
  onSelectDate: (dateKey: string) => void;
  onSelectEvent: (id: string) => void;
}) {
  const monthDays = getAgendaMonthGridDateKeys(dateKey);
  const clientById = useMemo(() => new Map(clients.map((client) => [client.id, client.nome])), [clients]);
  const processById = useMemo(() => new Map(processes.map((process) => [process.id, process])), [processes]);
  const memberById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);
  const selectedMonth = dateKey.slice(0, 7);

  return (
    <section aria-label="Agenda mensal" className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_8px_24px_-20px_rgba(23,25,26,.4)]">
      <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50/80">
        {WEEKDAY_SHORT.map((day) => <div key={day} className="px-1 py-2 text-center text-[9px] font-extrabold uppercase tracking-wide text-stone-500 sm:text-[10px]">{day}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {monthDays.map((dayKey) => {
          const dayEvents = events.filter((event) => getEventIntervalForAgendaDay(event, dayKey)).sort((a, b) => a.inicio.localeCompare(b.inicio));
          const parts = dateKeyParts(dayKey);
          const inMonth = dayKey.slice(0, 7) === selectedMonth;
          const isSelected = dayKey === dateKey;
          const isToday = dayKey === getAgendaDateKey(new Date());
          return <div key={dayKey} className={cn("flex min-h-[118px] min-w-0 flex-col border-b border-r border-stone-100 p-1 sm:min-h-[138px] sm:p-2", !inMonth && "bg-stone-50/70", isSelected && "bg-gold-soft/30 dark:bg-gold/10")}>
            <div className="mb-1 flex items-start justify-between gap-1">
              <button type="button" onClick={() => onSelectDate(dayKey)} aria-label={`Abrir dia ${formatAgendaDateLabel(dayKey)}${dayEvents.length ? `, ${dayEvents.length} eventos` : ""}`} aria-pressed={isSelected} className={cn("flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold", !inMonth && "text-stone-300 dark:text-zinc-600", inMonth && !isSelected && "text-stone-600 hover:bg-gold-soft dark:text-zinc-300 dark:hover:bg-gold/15", isSelected && "bg-[#17191a] text-white dark:bg-gold dark:text-neutral-950", !isSelected && isToday && "ring-1 ring-gold text-gold-dark dark:text-gold")}>{parts.day}</button>
              {dayEvents.length > 0 && <span className="rounded-full bg-stone-100 px-1.5 py-0.5 text-[8px] font-bold tabular-nums text-stone-500 sm:text-[9px]">{dayEvents.length}</span>}
            </div>
            <div className="space-y-1 overflow-hidden">
              {dayEvents.slice(0, 3).map((event) => <button key={event.id} type="button" onClick={() => onSelectEvent(event.id)} aria-label={`Abrir evento ${event.titulo}, ${formatEventTime(event)}${eventDetails(event, clientById, processById, memberById) ? `. ${eventDetails(event, clientById, processById, memberById)}` : ""}`} className={cn("flex w-full min-w-0 items-center gap-1 overflow-hidden rounded-md border-l-[3px] px-1 py-1 text-left text-[8px] font-semibold leading-3 transition hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:px-1.5 sm:text-[9px]", TYPE_STYLE[event.tipo].card, "border-l-gold")}>
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", TYPE_STYLE[event.tipo].dot)} aria-hidden="true" /><span className="truncate">{event.titulo}</span>
              </button>)}
              {dayEvents.length > 3 && <button type="button" onClick={() => onSelectDate(dayKey)} aria-label={`Abrir dia com mais ${dayEvents.length - 3} eventos`} className="w-full truncate text-left text-[9px] font-bold text-gold-dark hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold dark:text-gold"><span className="sm:hidden">+{dayEvents.length - 3}</span><span className="hidden sm:inline">+{dayEvents.length - 3} eventos · abrir dia</span></button>}
            </div>
          </div>;
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-stone-100 px-3 py-2 text-[9px] text-stone-500 sm:text-[10px]" aria-label="Legenda dos tipos de evento">
        {(Object.keys(TYPE_STYLE) as AgendaTipo[]).map((type) => <span key={type} className="inline-flex items-center gap-1"><span className={cn("h-1.5 w-1.5 rounded-full", TYPE_STYLE[type].dot)} aria-hidden="true" />{TYPE_STYLE[type].label}</span>)}
      </div>
      <span className="sr-only" aria-live="polite">Mês com {events.length} eventos reais.</span>
    </section>
  );
}

export function AgendaWorkspaceViews({
  mode,
  dateKey,
  events,
  members,
  clients,
  processes,
  onSelectEvent,
  onSelectTime,
  onSelectDate,
}: {
  mode: "day" | "week" | "month" | "team";
  dateKey: string;
  events: AgendaEvent[];
  members: AgendaMember[];
  clients: AgendaClientOption[];
  processes: AgendaProcessOption[];
  onSelectEvent: (id: string) => void;
  onSelectTime?: (dateKey: string, minute: number, responsavelId: string | null) => void;
  onSelectDate: (dateKey: string) => void;
}) {
  if (mode === "team") return <TeamDayTimeline dateKey={dateKey} eventos={events} membros={members} clientes={clients} processos={processes} onSelectEvent={onSelectEvent} onSelectTime={onSelectTime ? (minute, responsavelId) => onSelectTime(dateKey, minute, responsavelId) : undefined} />;
  if (mode === "week") return <AgendaWeekGrid dateKey={dateKey} events={events} members={members} clients={clients} processes={processes} onSelectDate={onSelectDate} onSelectEvent={onSelectEvent} onSelectTime={onSelectTime} />;
  if (mode === "month") return <AgendaMonthGrid dateKey={dateKey} events={events} clients={clients} processes={processes} members={members} onSelectDate={onSelectDate} onSelectEvent={onSelectEvent} />;
  return <AgendaDayGrid dateKey={dateKey} events={events} members={members} clients={clients} processes={processes} onSelectEvent={onSelectEvent} onSelectTime={onSelectTime} />;
}

export function AgendaSidebar({
  events,
  members,
  dateKey,
  onSelectDate,
  onOpenEvent,
  selectedMemberIds,
  onToggleMember,
  memberSearch,
  onMemberSearch,
  collapsed,
  mobileOpen,
  onCloseMobile,
}: {
  events: AgendaEvent[];
  members: AgendaMember[];
  dateKey: string;
  onSelectDate: (dateKey: string) => void;
  onOpenEvent: (eventId: string) => void;
  selectedMemberIds: Set<string> | null;
  onToggleMember: (id: string) => void;
  memberSearch: string;
  onMemberSearch: (value: string) => void;
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const sidebarRef = useRef<HTMLElement | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [miniMonthKey, setMiniMonthKey] = useState(`${dateKey.slice(0, 7)}-01`);
  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const syncDesktopState = () => setIsDesktop(mediaQuery.matches);
    syncDesktopState();
    mediaQuery.addEventListener("change", syncDesktopState);
    return () => mediaQuery.removeEventListener("change", syncDesktopState);
  }, []);
  useEffect(() => {
    setMiniMonthKey(`${dateKey.slice(0, 7)}-01`);
  }, [dateKey]);
  useEffect(() => {
    if (!mobileOpen || isDesktop) return;

    const sidebar = sidebarRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const getFocusableElements = () => Array.from(sidebar?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) ?? []).filter((element) => element.getClientRects().length > 0);
    const focusables = getFocusableElements();
    (focusables[0] ?? sidebar)?.focus();

    const handleSidebarKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseMobile();
        return;
      }
      if (event.key !== "Tab" || !sidebar) return;

      const currentFocusables = getFocusableElements();
      const first = currentFocusables[0];
      const last = currentFocusables[currentFocusables.length - 1];
      if (!first || !last) {
        event.preventDefault();
        sidebar.focus();
      } else if (event.shiftKey && (document.activeElement === first || !sidebar.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !sidebar.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleSidebarKeyDown);
    return () => {
      document.removeEventListener("keydown", handleSidebarKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [mobileOpen, isDesktop, onCloseMobile]);
  const miniDates = useMemo(() => getAgendaMonthGridDateKeys(miniMonthKey), [miniMonthKey]);
  const dateEventCounts = useMemo(() => countAgendaEventsByDate(events, miniDates), [events, miniDates]);
  const deadlines = useMemo(() => {
    const today = getAgendaDateKey(new Date());
    const maxDate = shiftAgendaDateKey(today, 14);
    return events.filter((event) => (event.tipo === "prazo" || event.tipo === "audiencia"))
      .filter((event) => {
        const eventDate = getAgendaDateKey(event.inicio);
        return eventDate >= today && eventDate <= maxDate;
      })
      .sort((left, right) => left.inicio.localeCompare(right.inicio))
      .slice(0, 5);
  }, [events]);
  const onMiniMonthChange = (direction: -1 | 1) => setMiniMonthKey((current) => shiftAgendaMonthKey(current, direction));

  return <>
    {mobileOpen && <button type="button" aria-label="Fechar filtros da agenda" onClick={onCloseMobile} className="fixed inset-0 z-40 bg-[#17191a]/35 backdrop-blur-[1px] lg:hidden" />}
    <aside ref={sidebarRef} tabIndex={-1} id="agenda-sidebar" aria-label="Filtros da agenda" aria-hidden={isDesktop ? collapsed : !mobileOpen} inert={isDesktop ? collapsed : !mobileOpen} role={mobileOpen && !isDesktop ? "dialog" : undefined} aria-modal={mobileOpen && !isDesktop ? true : undefined} className={cn("fixed inset-y-0 left-0 z-50 flex w-[min(86vw,300px)] flex-col gap-3 overflow-y-auto overscroll-contain border-r border-stone-200 bg-[#fcfcfb] p-3 shadow-2xl transition-[transform,width,padding] duration-200 motion-reduce:transition-none lg:sticky lg:top-0 lg:z-0 lg:h-[calc(100vh-7rem)] lg:w-auto lg:translate-x-0 lg:border lg:rounded-2xl lg:shadow-none lg:overflow-x-hidden lg:overflow-y-auto", mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0", collapsed && "lg:hidden")}>
      <div className="flex items-center justify-between gap-2 px-1 py-1 lg:hidden"><p className="text-sm font-extrabold text-[#303334] dark:text-zinc-100">Filtros</p><button type="button" onClick={onCloseMobile} aria-label="Fechar filtros" className="rounded-lg p-2 text-stone-500 hover:bg-stone-100"><X className="h-4 w-4" aria-hidden="true" /></button></div>
      <div>
        <MiniCalendar monthDateKey={miniMonthKey} selectedDateKey={dateKey} eventCounts={dateEventCounts} onSelect={onSelectDate} onMonthChange={onMiniMonthChange} />
      </div>
      <div>
        <MembersFilter members={members} events={events} search={memberSearch} onSearch={onMemberSearch} onClearSearch={() => onMemberSearch("")} onToggleAll={() => onToggleMember("__all__")} selectedMemberIds={selectedMemberIds} onToggle={onToggleMember} />
      </div>
      <section className={cn("overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_6px_18px_-18px_rgba(23,25,26,.45)]")}>
        <div className="flex items-center justify-between border-b border-stone-100 px-3 py-2.5"><div><h3 className="text-xs font-extrabold text-[#303334] dark:text-zinc-100">Alertas</h3><p className="mt-0.5 text-[10px] text-stone-400">Prazos e audiências · até 14 dias</p></div><Clock3 className="h-3.5 w-3.5 text-gold-dark dark:text-gold" aria-hidden="true" /></div>
        {deadlines.length ? <ul className="max-h-52 divide-y divide-stone-100 overflow-y-auto">{deadlines.map((event) => <li key={event.id}><button type="button" onClick={() => onOpenEvent(event.id)} className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition hover:bg-gold-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold dark:hover:bg-gold/10"><span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", TYPE_STYLE[event.tipo].dot)} aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-bold text-stone-700">{event.titulo}</span><span className="mt-0.5 block text-[9px] text-stone-400">{formatAgendaDateLabel(getAgendaDateKey(event.inicio), { day: "numeric", month: "short" })} · {formatEventTime(event)}</span></span></button></li>)}</ul> : <p className="px-3 py-3 text-[10px] text-stone-400">Nenhum prazo ou audiência nos próximos 14 dias.</p>}
      </section>
    </aside>
  </>;
}

export function AgendaTopbar({
  mode,
  dateKey,
  canWrite,
  onModeChange,
  onPrevious,
  onNext,
  onToday,
  onCreate,
  onOpenFilters,
  sidebarCollapsed,
  onToggleSidebar,
  onSelectDate,
  selectedType,
  eventTypeCounts,
  totalEventCount,
  onTypeChange,
}: {
  mode: AgendaCalendarMode;
  dateKey: string;
  canWrite: boolean;
  onModeChange: (mode: AgendaCalendarMode) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onCreate: () => void;
  onOpenFilters: () => void;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onSelectDate: (dateKey: string) => void;
  selectedType: AgendaEventTypeFilter;
  eventTypeCounts: Record<AgendaTipo, number>;
  totalEventCount: number;
  onTypeChange: (type: AgendaEventTypeFilter) => void;
}) {
  const reducedMotionConfig = useReducedMotionConfig();
  const prefersReducedMotion = useReducedMotion();
  const shouldReduceMotion = reducedMotionConfig === true || prefersReducedMotion === true;
  const weekKeys = getAgendaWeekDateKeys(dateKey);
  const weekStart = weekKeys[0] ?? dateKey;
  const weekEnd = weekKeys[6] ?? dateKey;
  const title = mode === "month"
    ? formatAgendaDateLabel(`${dateKey.slice(0, 7)}-01`, { month: "long", year: "numeric" })
    : mode === "week"
      ? `${formatAgendaDateLabel(weekStart, { day: "numeric", month: "short" })} – ${formatAgendaDateLabel(weekEnd, { day: "numeric", month: "short", year: "numeric" })}`
      : formatAgendaDateLabel(dateKey, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const typeFilters: AgendaEventTypeFilter[] = ["todos", ...(Object.keys(TYPE_STYLE) as AgendaTipo[])];

  const typeOptions = typeFilters.map((type) => ({
    value: type,
    label: type === "todos" ? "Todos" : TYPE_STYLE[type].label,
    count: type === "todos" ? totalEventCount : eventTypeCounts[type],
    colorDot: type === "todos" ? undefined : TYPE_STYLE[type].dot,
  }));
  const segmentClass = (active: boolean) => cn("relative isolate shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:px-3 sm:text-[11px]", active ? "text-white dark:text-neutral-950" : "text-stone-500 hover:bg-white hover:text-stone-800 dark:text-zinc-400 dark:hover:bg-zinc-700/60 dark:hover:text-zinc-100");
  const segmentHighlight = shouldReduceMotion
    ? <span aria-hidden="true" className="absolute inset-0 z-0 rounded-lg bg-[#17191a] shadow-sm dark:bg-gold" />
    : <motion.span aria-hidden="true" layoutId="agenda-view-mode-selection" transition={{ type: "spring", stiffness: 520, damping: 42 }} className="absolute inset-0 z-0 rounded-lg bg-[#17191a] shadow-sm dark:bg-gold" />;
  const modeItems: Array<{ value: AgendaCalendarMode; label: string }> = [{ value: "day", label: "Dia" }, { value: "week", label: "Semana" }, { value: "month", label: "Mês" }, { value: "agenda", label: "Lista" }];

  return <div className="space-y-2.5 rounded-2xl border border-stone-200 bg-white p-2.5 shadow-[0_6px_18px_-18px_rgba(23,25,26,.45)] sm:p-3">
    {/* Uma única linha em desktop; abaixo de lg os itens quebram de linha */}
    <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
      <button type="button" onClick={onOpenFilters} aria-label="Abrir filtros e calendário" aria-controls="agenda-sidebar" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stone-200 text-stone-500 transition hover:border-gold/40 hover:bg-gold-soft hover:text-gold-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold dark:hover:bg-gold/15 dark:hover:text-gold lg:hidden"><Menu className="h-4 w-4" aria-hidden="true" /></button>
      <button type="button" onClick={onToggleSidebar} aria-label={sidebarCollapsed ? "Mostrar barra lateral da agenda" : "Ocultar barra lateral da agenda"} aria-expanded={!sidebarCollapsed} aria-controls="agenda-sidebar" title={sidebarCollapsed ? "Mostrar barra lateral" : "Ocultar barra lateral"} className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stone-200 text-stone-500 transition hover:border-gold/40 hover:bg-gold-soft hover:text-gold-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold dark:hover:bg-gold/15 dark:hover:text-gold lg:flex"><PanelLeft className="h-4 w-4" aria-hidden="true" /></button>
      <button type="button" onClick={onToday} className="h-9 shrink-0 rounded-xl bg-gold-soft px-2.5 text-[11px] font-bold text-gold-dark transition hover:bg-gold/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold dark:bg-gold/15 dark:text-gold dark:hover:bg-gold/25 sm:px-3">Hoje</button>
      <div className="flex shrink-0 items-center gap-0.5">
        <button type="button" onClick={onPrevious} aria-label="Período anterior" className="flex h-9 w-8 items-center justify-center rounded-xl text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:w-9"><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button>
        <button type="button" onClick={onNext} aria-label="Próximo período" className="flex h-9 w-8 items-center justify-center rounded-xl text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:w-9"><ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
      </div>
      <p title={title} className="min-w-0 flex-1 basis-[8rem] truncate px-0.5 text-xs font-extrabold leading-tight text-[#303334] first-letter:uppercase dark:text-zinc-100 sm:px-1 sm:text-sm">{title}</p>
      <div className="inline-flex shrink-0 items-center gap-0.5 rounded-xl bg-stone-200/60 p-1 dark:bg-zinc-800/90" role="group" aria-label="Visualização da agenda">
        {modeItems.map((item) => {
          const isActive = mode === item.value;
          return <button key={item.value} type="button" onClick={() => onModeChange(item.value)} aria-pressed={isActive} className={segmentClass(isActive)}>{isActive && segmentHighlight}<span className="relative z-10">{item.label}</span></button>;
        })}
      </div>
      <button type="button" onClick={() => onModeChange(mode === "team" ? "day" : "team")} aria-pressed={mode === "team"} className={cn("shrink-0 rounded-xl border px-2.5 py-2 text-[10px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold", mode === "team" ? "border-gold bg-gold-soft text-gold-dark dark:bg-gold/15 dark:text-gold" : "border-stone-200 text-stone-500 hover:border-gold/40 hover:text-gold-dark dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-gold/40 dark:hover:text-gold")}>{mode === "team" ? "Equipe · Dia" : "Equipe"}</button>
      <StatusFilterSelect value={selectedType} options={typeOptions} onChange={(value) => onTypeChange(value as AgendaEventTypeFilter)} ariaLabel="Filtrar agenda por tipo de evento" align="end" triggerClassName="h-9 min-w-0 shrink-0 text-[11px]" />
    </div>
    {(mode === "day" || mode === "team") && <AgendaWeekStrip dateKey={dateKey} onSelectDate={onSelectDate} />}
    {canWrite && <div className="flex justify-end"><button type="button" onClick={onCreate} className="inline-flex h-9 w-full shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gold px-3 text-[11px] font-extrabold text-neutral-950 shadow-sm transition hover:-translate-y-0.5 hover:bg-gold-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 dark:text-neutral-950 sm:w-auto sm:px-3.5"><Plus className="h-4 w-4" aria-hidden="true" /> Agendar</button></div>}
  </div>;
}
