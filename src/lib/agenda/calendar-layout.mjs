import {
  getAgendaDateKey,
  getEventIntervalForAgendaDay,
  shiftAgendaDateKey,
} from "./team-timeline.mjs";

/** Returns Monday through Sunday for the week containing dateKey. */
export function getAgendaWeekDateKeys(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (![year, month, day].every(Number.isFinite)) return [];
  const weekday = new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const monday = shiftAgendaDateKey(dateKey, mondayOffset);
  return Array.from({ length: 7 }, (_, index) => shiftAgendaDateKey(monday, index));
}

/** Returns a Monday-first 6-week month grid containing dateKey. */
export function getAgendaMonthGridDateKeys(dateKey) {
  const [year, month] = dateKey.split("-").map(Number);
  if (![year, month].every(Number.isFinite)) return [];
  const firstDateKey = `${year}-${String(month).padStart(2, "0")}-01`;
  const firstWeek = getAgendaWeekDateKeys(firstDateKey);
  if (firstWeek.length === 0) return [];
  return Array.from({ length: 42 }, (_, index) => shiftAgendaDateKey(firstWeek[0], index));
}

/**
 * Lay out overlapping events on a day into side-by-side columns.
 * Intervals are derived in the agenda's configured Sao Paulo timezone.
 */
export function layoutAgendaEventsInColumns(events, dateKey) {
  const intervals = events
    .map((event) => ({ event, interval: getEventIntervalForAgendaDay(event, dateKey) }))
    .filter((item) => item.interval)
    .sort((left, right) => left.interval.startMinute - right.interval.startMinute
      || left.interval.endMinute - right.interval.endMinute
      || left.event.titulo.localeCompare(right.event.titulo, "pt-BR"));

  const result = [];
  let index = 0;
  while (index < intervals.length) {
    const cluster = [intervals[index]];
    let clusterEnd = intervals[index].interval.endMinute;
    index += 1;
    while (index < intervals.length && intervals[index].interval.startMinute < clusterEnd) {
      cluster.push(intervals[index]);
      clusterEnd = Math.max(clusterEnd, intervals[index].interval.endMinute);
      index += 1;
    }

    const columnEnds = [];
    const laidOut = cluster.map(({ event, interval }) => {
      let column = columnEnds.findIndex((endMinute) => endMinute <= interval.startMinute);
      if (column === -1) column = columnEnds.length;
      columnEnds[column] = interval.endMinute;
      return { event, ...interval, column };
    });
    const columns = Math.max(1, columnEnds.length);
    result.push(...laidOut.map((item) => ({ ...item, columns })));
  }

  return result;
}

/** Counts only actual events on each Sao Paulo calendar date. */
export function countAgendaEventsByDate(events, dateKeys = null) {
  const counts = new Map();
  if (dateKeys) {
    for (const dateKey of dateKeys) {
      const count = events.reduce((total, event) => total + (getEventIntervalForAgendaDay(event, dateKey) ? 1 : 0), 0);
      if (count > 0) counts.set(dateKey, count);
    }
    return counts;
  }
  for (const event of events) {
    const dateKey = getAgendaDateKey(event.inicio);
    if (dateKey) counts.set(dateKey, (counts.get(dateKey) ?? 0) + 1);
  }
  return counts;
}
