export const AGENDA_TIME_ZONE = "America/Sao_Paulo";
export const DEFAULT_TIMELINE_START_MINUTE = 6 * 60;
export const DEFAULT_TIMELINE_END_MINUTE = 23 * 60;

const zonedDateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: AGENDA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function partsFor(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return Object.fromEntries(zonedDateTimeFormatter.formatToParts(date).map(({ type, value: part }) => [type, part]));
}

export function getAgendaDateKey(value = new Date()) {
  const parts = partsFor(value);
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : "";
}

export function shiftAgendaDateKey(dateKey, days) {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (![year, month, day, days].every(Number.isFinite)) return dateKey;
  const shifted = new Date(Date.UTC(year, month - 1, day + days, 12));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}`;
}

export function shiftAgendaMonthKey(dateKey, months) {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (![year, month, day, months].every(Number.isFinite)) return dateKey;
  const monthIndex = year * 12 + month - 1 + months;
  const targetYear = Math.floor(monthIndex / 12);
  const targetMonthIndex = ((monthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonthIndex + 1, 0)).getUTCDate();
  return `${targetYear}-${String(targetMonthIndex + 1).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

export function formatAgendaDateLabel(dateKey, options = { weekday: "long", day: "numeric", month: "long", year: "numeric" }) {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (![year, month, day].every(Number.isFinite)) return dateKey;
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return new Intl.DateTimeFormat("pt-BR", { ...options, timeZone: "UTC" }).format(date);
}

export function getAgendaMinuteOfDay(value) {
  const parts = partsFor(value);
  return parts ? Number(parts.hour) * 60 + Number(parts.minute) : null;
}

export function formatAgendaTime(value) {
  const minute = getAgendaMinuteOfDay(value);
  if (minute === null) return "";
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

export function getISOForAgendaMinute(dateKey, minuteOfDay) {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (![year, month, day, minuteOfDay].every(Number.isFinite)) return null;
  const targetUtc = Date.UTC(year, month - 1, day) + minuteOfDay * 60_000;
  let instant = targetUtc;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = partsFor(new Date(instant));
    if (!parts) return null;
    const representedUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
    const difference = targetUtc - representedUtc;
    instant += difference;
    if (difference === 0) break;
  }
  return new Date(instant).toISOString();
}

function dateKeyIsBefore(left, right) {
  return left < right;
}

export function getEventIntervalForAgendaDay(event, dateKey) {
  const startDate = getAgendaDateKey(event.inicio);
  if (!startDate) return null;
  const endDate = event.fim ? getAgendaDateKey(event.fim) : startDate;
  if (!endDate || dateKeyIsBefore(dateKey, startDate) || dateKeyIsBefore(endDate, dateKey)) return null;

  const startMinute = event.dia_inteiro ? 0 : dateKey === startDate ? getAgendaMinuteOfDay(event.inicio) : 0;
  const rawEndMinute = event.fim ? getAgendaMinuteOfDay(event.fim) : null;
  const endMinute = event.dia_inteiro
    ? 24 * 60
    : event.fim
      ? dateKey === endDate ? rawEndMinute : 24 * 60
      : Math.min(24 * 60, (startMinute ?? 0) + 60);

  if (startMinute === null || endMinute === null) return null;
  // An event ending exactly at midnight does not occupy the following day.
  if (event.fim && dateKey === endDate && endMinute === 0 && endDate !== startDate) return null;
  return { startMinute, endMinute: Math.max(startMinute + 1, endMinute) };
}

export function getAgendaTimelineRange(intervals) {
  const valid = intervals.filter((interval) => interval && Number.isFinite(interval.startMinute) && Number.isFinite(interval.endMinute));
  const earliest = valid.reduce((min, interval) => Math.min(min, interval.startMinute), DEFAULT_TIMELINE_START_MINUTE);
  const latest = valid.reduce((max, interval) => Math.max(max, interval.endMinute), DEFAULT_TIMELINE_END_MINUTE);
  const startMinute = Math.max(0, Math.min(DEFAULT_TIMELINE_START_MINUTE, Math.floor(earliest / 60) * 60));
  const endMinute = Math.min(24 * 60, Math.max(DEFAULT_TIMELINE_END_MINUTE, Math.ceil(latest / 60) * 60));
  const ticks = [];
  for (let minute = startMinute; minute <= endMinute; minute += 60) {
    ticks.push({ minute, label: minute === 24 * 60 ? "24:00" : `${String(Math.floor(minute / 60)).padStart(2, "0")}:00` });
  }
  return { startMinute, endMinute: Math.max(startMinute + 60, endMinute), ticks };
}

export function layoutAgendaEvents(events, dateKey) {
  const intervals = events
    .map((event) => ({ event, interval: getEventIntervalForAgendaDay(event, dateKey) }))
    .filter((item) => item.interval)
    .sort((left, right) => left.interval.startMinute - right.interval.startMinute || left.interval.endMinute - right.interval.endMinute || left.event.titulo.localeCompare(right.event.titulo, "pt-BR"));

  const rowEnds = [];
  return intervals.map(({ event, interval }) => {
    let row = rowEnds.findIndex((endMinute) => endMinute <= interval.startMinute);
    if (row === -1) row = rowEnds.length;
    rowEnds[row] = interval.endMinute;
    return { event, ...interval, row };
  });
}

export function positionOnAgendaAxis(startMinute, endMinute, range) {
  const total = range.endMinute - range.startMinute;
  if (total <= 0) return { leftPercent: 0, widthPercent: 0 };
  const start = Math.max(range.startMinute, Math.min(startMinute, range.endMinute));
  const end = Math.max(start + 1, Math.min(endMinute, range.endMinute));
  return {
    leftPercent: ((start - range.startMinute) / total) * 100,
    widthPercent: ((end - start) / total) * 100,
  };
}
