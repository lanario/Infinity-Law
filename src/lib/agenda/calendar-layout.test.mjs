import test from "node:test";
import assert from "node:assert/strict";
import {
  countAgendaEventsByDate,
  getAgendaMonthGridDateKeys,
  getAgendaWeekDateKeys,
  layoutAgendaEventsInColumns,
} from "./calendar-layout.mjs";

test("agenda week is Monday-first and contains the selected Sunday", () => {
  assert.deepEqual(getAgendaWeekDateKeys("2026-10-18"), [
    "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18",
  ]);
});

test("month grid always contains six complete Monday-first weeks", () => {
  const keys = getAgendaMonthGridDateKeys("2026-10-15");
  assert.equal(keys.length, 42);
  assert.equal(keys[0], "2026-09-28");
  assert.equal(keys[14], "2026-10-12");
  assert.equal(keys[41], "2026-11-08");
});

test("overlapping events receive separate visual columns while adjacent events can reuse a column", () => {
  const events = [
    { id: "a", titulo: "A", inicio: "2026-10-12T12:00:00-03:00", fim: "2026-10-12T13:00:00-03:00", dia_inteiro: false },
    { id: "b", titulo: "B", inicio: "2026-10-12T12:30:00-03:00", fim: "2026-10-12T13:30:00-03:00", dia_inteiro: false },
    { id: "c", titulo: "C", inicio: "2026-10-12T13:00:00-03:00", fim: "2026-10-12T14:00:00-03:00", dia_inteiro: false },
  ];
  const layout = layoutAgendaEventsInColumns(events, "2026-10-12");
  assert.deepEqual(layout.map(({ event, column, columns }) => [event.id, column, columns]), [
    ["a", 0, 2], ["b", 1, 2], ["c", 0, 2],
  ]);
});

test("mini calendar counts only real event dates in the Sao Paulo timezone", () => {
  const counts = countAgendaEventsByDate([
    { id: "a", titulo: "A", inicio: "2026-10-12T02:30:00Z", fim: null, dia_inteiro: false },
    { id: "b", titulo: "B", inicio: "2026-10-12T12:00:00Z", fim: null, dia_inteiro: false },
  ]);
  assert.equal(counts.get("2026-10-11"), 1);
  assert.equal(counts.get("2026-10-12"), 1);
  assert.equal(counts.size, 2);
});

test("mini calendar counts a real multi-day event on each occupied date", () => {
  const event = {
    id: "span",
    titulo: "Prazo em curso",
    inicio: "2026-10-11T23:00:00-03:00",
    fim: "2026-10-13T02:00:00-03:00",
    dia_inteiro: false,
  };
  const counts = countAgendaEventsByDate([event], ["2026-10-11", "2026-10-12", "2026-10-13", "2026-10-14"]);
  assert.equal(counts.get("2026-10-11"), 1);
  assert.equal(counts.get("2026-10-12"), 1);
  assert.equal(counts.get("2026-10-13"), 1);
  assert.equal(counts.has("2026-10-14"), false);
});
