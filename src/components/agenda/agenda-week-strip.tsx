"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatAgendaDateLabel, getAgendaDateKey, shiftAgendaDateKey } from "@/lib/agenda/team-timeline.mjs";
import { getAgendaWeekDateKeys } from "@/lib/agenda/calendar-layout.mjs";

const WEEKDAY_SHORT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const navButton = "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-stone-200 text-stone-500 transition hover:border-gold/40 hover:bg-gold-soft hover:text-gold-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold";

// Faixa dos 7 dias da semana do dia selecionado (mesma semana seg–dom usada na visão Semana).
export function AgendaWeekStrip({ dateKey, onSelectDate }: { dateKey: string; onSelectDate: (dateKey: string) => void }) {
  const today = getAgendaDateKey(new Date());
  return (
    <nav aria-label="Dias da semana" className="flex min-w-0 basis-full items-center justify-center gap-1 sm:gap-2">
      <button type="button" onClick={() => onSelectDate(shiftAgendaDateKey(dateKey, -7))} aria-label="Semana anterior" className={navButton}><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button>
      <ul className="flex min-w-0 max-w-md flex-1 items-center justify-between gap-0.5">
        {getAgendaWeekDateKeys(dateKey).map((day, index) => {
          const isSelected = day === dateKey;
          return (
            <li key={day} className="min-w-0 flex-1">
              <button type="button" onClick={() => onSelectDate(day)} aria-pressed={isSelected} aria-label={formatAgendaDateLabel(day)} className={cn("flex w-full min-w-0 flex-col items-center rounded-xl px-1 py-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold", isSelected ? "bg-[#17191a] text-white" : "text-stone-600 hover:bg-gold-soft", !isSelected && day === today && "ring-1 ring-gold")}>
                <span className={cn("text-[9px] font-bold uppercase leading-3 tracking-wide", isSelected ? "text-gold" : "text-stone-400")}>{WEEKDAY_SHORT[index]}</span>
                <span className="text-sm font-extrabold leading-5 tabular-nums">{Number(day.slice(8, 10))}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <button type="button" onClick={() => onSelectDate(shiftAgendaDateKey(dateKey, 7))} aria-label="Próxima semana" className={navButton}><ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
    </nav>
  );
}
