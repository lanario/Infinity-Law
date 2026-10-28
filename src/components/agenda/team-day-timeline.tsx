"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CircleUserRound, Clock3, UserRound } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ProfileAvatar } from "@/components/layout/profile-avatar";
import { SLOT_STEP_MINUTES, SlotPreview, snapMinuteFromOffset } from "@/components/agenda/slot-hover-preview";
import type { AgendaTimelineItem } from "@/lib/agenda/team-timeline.mjs";
import {
  formatAgendaTime,
  getAgendaDateKey,
  getAgendaMinuteOfDay,
  getAgendaTimelineRange,
  getEventIntervalForAgendaDay,
  layoutAgendaEvents,
  positionOnAgendaAxis,
  formatAgendaDateLabel,
} from "@/lib/agenda/team-timeline.mjs";

type EventoTipo = "audiencia" | "reuniao" | "prazo" | "compromisso";
type TimelineEvent = {
  id: string;
  titulo: string;
  tipo: EventoTipo;
  inicio: string;
  fim: string | null;
  dia_inteiro: boolean;
  responsavel_id: string | null;
  processo_id: string | null;
  cliente_id: string | null;
};
type TeamMember = { id: string; nome: string; avatar_url: string | null; ativo: boolean };
type TimelineLane = { id: string; name: string; member: TeamMember | null; tone: string; items: AgendaTimelineItem<TimelineEvent>[] };

const TYPE_STYLE: Record<EventoTipo, { label: string; className: string }> = {
  audiencia: { label: "Audiência", className: "border-gold/45 bg-[#fbf6e9] text-[#80600b]" },
  reuniao: { label: "Reunião", className: "border-stone-300 bg-stone-100 text-[#303334]" },
  prazo: { label: "Prazo", className: "border-rose-300 bg-rose-50 text-rose-800" },
  compromisso: { label: "Compromisso", className: "border-sky-200 bg-sky-50 text-sky-800" },
};

const isAvatarUrl = (value: string | null) => Boolean(value && /^https?:\/\//i.test(value));

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase("pt-BR") ?? "").join("");
}

function formatMinute(minute: number) {
  if (minute >= 24 * 60) return "24:00";
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

function avatarTone(index: number) {
  return ["bg-[#f7edc9] text-[#80600b]", "bg-stone-200 text-stone-700", "bg-rose-100 text-rose-700", "bg-sky-100 text-sky-700", "bg-emerald-100 text-emerald-700"][index % 5] ?? "bg-stone-100 text-stone-600";
}

interface TeamDayTimelineProps {
  dateKey: string;
  eventos: TimelineEvent[];
  membros: TeamMember[];
  clientes: Array<{ id: string; nome: string }>;
  processos: Array<{ id: string; numero_cnj: string | null; tipo_acao: string | null }>;
  onSelectEvent: (eventId: string) => void;
  onSelectTime?: (minuteOfDay: number, responsavelId: string | null) => void;
}

export function TeamDayTimeline({ dateKey, eventos, membros, clientes, processos, onSelectEvent, onSelectTime }: TeamDayTimelineProps) {
  const [clock, setClock] = useState(() => new Date());
  const [slotHover, setSlotHover] = useState<{ laneId: string; minute: number } | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => setClock(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const isToday = getAgendaDateKey(clock) === dateKey;
  const currentMinute = isToday ? getAgendaMinuteOfDay(clock) : null;
  const memberById = useMemo(() => new Map(membros.map((member) => [member.id, member])), [membros]);
  const clientById = useMemo(() => new Map(clientes.map((client) => [client.id, client.nome])), [clientes]);
  const processById = useMemo(() => new Map(processos.map((process) => [process.id, process])), [processos]);

  const eventsByMember = useMemo(() => {
    const result = new Map<string | null, TimelineEvent[]>();
    for (const evento of eventos) {
      const key = evento.responsavel_id && memberById.has(evento.responsavel_id) ? evento.responsavel_id : null;
      const list = result.get(key);
      if (list) list.push(evento);
      else result.set(key, [evento]);
    }
    return result;
  }, [eventos, memberById]);

  const assignedMembers = useMemo(() => membros
    .filter((member) => member.ativo || layoutAgendaEvents(eventsByMember.get(member.id) ?? [], dateKey).length > 0)
    .sort((left, right) => left.nome.localeCompare(right.nome, "pt-BR")), [membros, dateKey, eventsByMember]);

  const laneData = useMemo(() => {
    const lanes: TimelineLane[] = assignedMembers.map((member, index) => ({
      id: member.id,
      name: member.nome,
      member,
      tone: avatarTone(index),
      items: layoutAgendaEvents(eventsByMember.get(member.id) ?? [], dateKey),
    }));
    const unassigned = layoutAgendaEvents(eventsByMember.get(null) ?? [], dateKey);
    if (unassigned.length > 0 || lanes.length === 0) {
      lanes.push({ id: "unassigned", name: "Sem responsável", member: null, tone: "bg-stone-100 text-stone-500", items: unassigned });
    }
    return lanes;
  }, [assignedMembers, dateKey, eventsByMember]);

  const intervals = useMemo(() => {
    const all = eventos.map((event) => getEventIntervalForAgendaDay(event, dateKey)).filter(Boolean);
    if (currentMinute !== null) all.push({ startMinute: currentMinute, endMinute: currentMinute + 1 });
    return all;
  }, [currentMinute, dateKey, eventos]);
  const range = useMemo(() => getAgendaTimelineRange(intervals), [intervals]);
  const hourCount = (range.endMinute - range.startMinute) / 60;
  const axisBackground = `linear-gradient(to right, #e9e7e3 1px, transparent 1px)`;
  const currentPosition = currentMinute === null ? null : positionOnAgendaAxis(currentMinute, currentMinute + 1, range).leftPercent;
  const hasEvents = laneData.some((lane) => lane.items.length > 0);
  const visibleEventCount = laneData.reduce((count, lane) => count + lane.items.length, 0);

  function selectTimeAt(clientX: number, bounds: DOMRect, fromKeyboard: boolean, responsavelId: string | null) {
    if (!onSelectTime || bounds.width <= 0) return;
    const offset = fromKeyboard ? bounds.width / 2 : Math.max(0, Math.min(bounds.width, clientX - bounds.left));
    onSelectTime(snapMinuteFromOffset(offset, bounds.width, range.startMinute, range.endMinute), responsavelId);
  }

  return (
    <motion.section initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.4, ease: "easeOut" }} aria-label="Agenda da equipe por horário" className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_8px_24px_-20px_rgba(23,25,26,0.4)]">
      <div className="overflow-x-auto overscroll-x-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold" tabIndex={0} aria-label="Linha do tempo. Use as setas de rolagem horizontal para consultar outros horários.">
        <div className="grid min-w-[1060px] grid-cols-[220px_minmax(840px,1fr)]">
          <div className="sticky left-0 top-0 z-30 flex h-14 items-center gap-2 border-b border-r border-stone-200 bg-stone-50 px-4 text-[11px] font-bold uppercase tracking-[0.08em] text-stone-600">
            <UserRound className="h-4 w-4 text-gold-dark" aria-hidden="true" /> Equipe <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[10px] text-stone-500">{assignedMembers.length}</span>
          </div>
          {/* px-7 gutter: first/last hour labels (centered on their line) stay inside the cell, clear of the sticky team column */}
          <div className="sticky top-0 z-20 h-14 border-b border-stone-200 bg-stone-50 px-7" aria-label="Eixo de horários">
            <div className="relative h-full">
              {range.ticks.map((tick) => {
                const position = positionOnAgendaAxis(tick.minute, tick.minute + 1, range).leftPercent;
                return <span key={tick.minute} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[11px] font-semibold tabular-nums text-stone-500" style={{ left: `${position}%` }}>{tick.label}</span>;
              })}
            </div>
          </div>

          {laneData.map((lane) => {
            const rowCount = Math.max(1, lane.items.reduce((count, item) => Math.max(count, item.row + 1), 0));
            const height = Math.max(73, rowCount * 48 + 14);
            return (
              <div key={lane.id} className="contents">
                <div className="sticky left-0 z-10 flex min-w-0 items-center gap-3 border-b border-r border-stone-100 bg-white px-3 py-2.5">
                  {lane.member ? (
                    <ProfileAvatar path={isAvatarUrl(lane.member.avatar_url) ? null : lane.member.avatar_url} url={isAvatarUrl(lane.member.avatar_url) ? lane.member.avatar_url : null} initials={initials(lane.name)} name={lane.name} className="h-9 w-9 border border-stone-200 !bg-gold-soft !text-gold-dark text-[11px]" />
                  ) : (
                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white text-[11px] font-extrabold", lane.tone)} aria-hidden="true">
                      {lane.member ? initials(lane.name) : <CircleUserRound className="h-4 w-4" />}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-[#303334]">{lane.name}</span>
                    <span className="mt-0.5 block truncate text-[10px] text-stone-400">{lane.member ? lane.member.ativo ? "Equipe do escritório" : "Responsável inativo" : `${lane.items.length} ${lane.items.length === 1 ? "evento" : "eventos"}`}</span>
                  </span>
                </div>
                <div className="border-b border-stone-100 px-7">
                <div
                  className={cn("relative border-r border-[#e9e7e3]", onSelectTime && "cursor-crosshair")}
                  style={{
                    height,
                    backgroundImage: axisBackground,
                    backgroundSize: `${100 / hourCount}% 100%`,
                  }}
                  aria-label={`Horários de ${lane.name}`}
                >
                  {onSelectTime && <button type="button" aria-label={`Criar evento para ${lane.name}; pelo teclado, o horário inicial será próximo ao meio do expediente`} className="absolute inset-0 z-0 cursor-crosshair rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold" onClick={(event) => selectTimeAt(event.clientX, event.currentTarget.getBoundingClientRect(), event.detail === 0, lane.member?.id ?? null)} onPointerMove={(event) => {
                    if (event.pointerType === "touch") return;
                    const bounds = event.currentTarget.getBoundingClientRect();
                    const minute = snapMinuteFromOffset(event.clientX - bounds.left, bounds.width, range.startMinute, range.endMinute);
                    setSlotHover((current) => current?.laneId === lane.id && current.minute === minute ? current : { laneId: lane.id, minute });
                  }} onPointerLeave={() => setSlotHover(null)} />}
                  {onSelectTime && slotHover?.laneId === lane.id && <SlotPreview minute={slotHover.minute} compact className="inset-y-1" style={{ left: `${((slotHover.minute - range.startMinute) / (range.endMinute - range.startMinute)) * 100}%`, width: `${(SLOT_STEP_MINUTES / (range.endMinute - range.startMinute)) * 100}%` }} />}
                  {currentPosition !== null && <span role="img" aria-label={`Horário atual ${formatAgendaTime(clock)}`} className="pointer-events-none absolute -top-1 bottom-0 z-10 w-px bg-rose-500" style={{ left: `${currentPosition}%` }}><span className="absolute -left-[4px] -top-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" /></span>}
                  {lane.items.map(({ event, startMinute, endMinute, row }) => {
                    const position = positionOnAgendaAxis(startMinute, endMinute, range);
                    const typeStyle = TYPE_STYLE[event.tipo];
                    const clientName = event.cliente_id ? clientById.get(event.cliente_id) : null;
                    const process = event.processo_id ? processById.get(event.processo_id) : null;
                    const relation = [clientName, process ? process.numero_cnj || process.tipo_acao : null].filter(Boolean).join(" · ");
                    const timeLabel = event.dia_inteiro ? "Dia inteiro" : `${formatMinute(startMinute)}–${formatMinute(endMinute)}`;
                    const details = [typeStyle.label, timeLabel, relation].filter(Boolean).join(" · ");
                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => onSelectEvent(event.id)}
                        title={`${event.titulo} · ${details}`}
                        aria-label={`Abrir ${event.titulo}. ${details}`}
                        className={cn("absolute z-[1] flex h-[40px] min-w-0 flex-col justify-center overflow-hidden rounded-full border px-3 text-left shadow-[0_2px_8px_-5px_rgba(23,25,26,.5)] transition hover:z-20 hover:brightness-[0.98] focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-1", typeStyle.className)}
                        style={{
                          left: `calc(${position.leftPercent}% + 2px)`,
                          width: `max(0px, calc(${position.widthPercent}% - 4px))`,
                          top: 7 + row * 48,
                        }}
                      >
                        <span className="block truncate text-[10px] font-extrabold leading-3">{event.titulo}</span>
                        <span className="mt-0.5 block truncate text-[9px] font-medium opacity-75">{details}</span>
                      </button>
                    );
                  })}
                </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {!hasEvents && (
        <div className="flex items-center gap-3 border-t border-stone-100 bg-[#fcfcfb] px-4 py-3 text-xs text-stone-500 sm:px-6">
          <CalendarClock className="h-4 w-4 shrink-0 text-gold-dark" aria-hidden="true" />
          <span>Nenhum evento nesta data. Agendamentos reais da equipe aparecerão nesta linha do tempo.</span>
          {isToday && <span className="ml-auto hidden items-center gap-1.5 text-[10px] text-stone-400 sm:inline-flex"><Clock3 className="h-3.5 w-3.5 text-rose-500" aria-hidden="true" /> Horário atual</span>}
        </div>
      )}
      <p className="sr-only" aria-live="polite">{hasEvents ? `${visibleEventCount} eventos encontrados em ${formatAgendaDateLabel(dateKey)}.` : `Nenhum evento em ${formatAgendaDateLabel(dateKey)}.`}</p>
    </motion.section>
  );
}
