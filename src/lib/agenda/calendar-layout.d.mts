import type { AgendaTimelineEvent } from "./team-timeline.mjs";

export function getAgendaWeekDateKeys(dateKey: string): string[];
export function getAgendaMonthGridDateKeys(dateKey: string): string[];
export function layoutAgendaEventsInColumns<T extends AgendaTimelineEvent>(events: T[], dateKey: string): Array<{ event: T; startMinute: number; endMinute: number; column: number; columns: number }>;
export function countAgendaEventsByDate(events: Array<AgendaTimelineEvent>, dateKeys?: string[] | null): Map<string, number>;
