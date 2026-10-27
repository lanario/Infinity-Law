export type AgendaInterval = { startMinute: number; endMinute: number };
export type AgendaTimelineEvent = {
  id: string;
  titulo: string;
  inicio: string;
  fim: string | null;
  dia_inteiro: boolean;
};
export type AgendaTimelineItem<T extends AgendaTimelineEvent = AgendaTimelineEvent> = AgendaInterval & {
  event: T;
  row: number;
};

export const AGENDA_TIME_ZONE: string;
export const DEFAULT_TIMELINE_START_MINUTE: number;
export const DEFAULT_TIMELINE_END_MINUTE: number;
export function getAgendaDateKey(value?: Date | string): string;
export function shiftAgendaDateKey(dateKey: string, days: number): string;
export function shiftAgendaMonthKey(dateKey: string, months: number): string;
export function formatAgendaDateLabel(dateKey: string, options?: Intl.DateTimeFormatOptions): string;
export function getAgendaMinuteOfDay(value: Date | string): number | null;
export function formatAgendaTime(value: Date | string): string;
export function getISOForAgendaMinute(dateKey: string, minuteOfDay: number): string | null;
export function getEventIntervalForAgendaDay(event: AgendaTimelineEvent, dateKey: string): AgendaInterval | null;
export function getAgendaTimelineRange(intervals: Array<AgendaInterval | null>): { startMinute: number; endMinute: number; ticks: Array<{ minute: number; label: string }> };
export function layoutAgendaEvents<T extends AgendaTimelineEvent>(events: T[], dateKey: string): AgendaTimelineItem<T>[];
export function positionOnAgendaAxis(startMinute: number, endMinute: number, range: Pick<AgendaInterval, "startMinute" | "endMinute">): { leftPercent: number; widthPercent: number };
