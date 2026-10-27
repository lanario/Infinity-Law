import test from "node:test";
import assert from "node:assert/strict";
import {
  getAgendaDateKey,
  getISOForAgendaMinute,
  getAgendaMinuteOfDay,
  getAgendaTimelineRange,
  getEventIntervalForAgendaDay,
  layoutAgendaEvents,
  positionOnAgendaAxis,
  shiftAgendaDateKey,
  shiftAgendaMonthKey,
} from "./team-timeline.mjs";

test("converte instante e horário para o fuso oficial da agenda", () => {
  assert.equal(getAgendaDateKey("2026-10-22T12:30:00.000Z"), "2026-10-22");
  assert.equal(getAgendaMinuteOfDay("2026-10-22T12:30:00.000Z"), 9 * 60 + 30);
});

test("navega dias civis sem depender do fuso local do navegador", () => {
  assert.equal(shiftAgendaDateKey("2026-10-31", 1), "2026-11-01");
  assert.equal(shiftAgendaDateKey("2026-11-01", -1), "2026-10-31");
});

test("navega meses civis sem ultrapassar o último dia do mês", () => {
  assert.equal(shiftAgendaMonthKey("2026-01-31", 1), "2026-02-28");
  assert.equal(shiftAgendaMonthKey("2026-12-31", 1), "2027-01-31");
  assert.equal(shiftAgendaMonthKey("2026-01-31", -1), "2025-12-31");
});

test("converte horário civil da agenda para instante ISO no fuso de São Paulo", () => {
  assert.equal(getISOForAgendaMinute("2026-10-22", 12 * 60), "2026-10-22T15:00:00.000Z");
});

test("calcula evento normal, sem duração, dia inteiro e evento atravessando meia-noite", () => {
  const day = "2026-10-22";
  assert.deepEqual(getEventIntervalForAgendaDay({ inicio: "2026-10-22T12:00:00Z", fim: "2026-10-22T14:00:00Z", dia_inteiro: false }, day), { startMinute: 540, endMinute: 660 });
  assert.deepEqual(getEventIntervalForAgendaDay({ inicio: "2026-10-22T12:00:00Z", fim: null, dia_inteiro: false }, day), { startMinute: 540, endMinute: 600 });
  assert.deepEqual(getEventIntervalForAgendaDay({ inicio: "2026-10-22T12:00:00Z", fim: null, dia_inteiro: true }, day), { startMinute: 0, endMinute: 1440 });
  const overnight = { inicio: "2026-10-22T23:30:00-03:00", fim: "2026-10-23T01:15:00-03:00", dia_inteiro: false };
  assert.deepEqual(getEventIntervalForAgendaDay(overnight, day), { startMinute: 1410, endMinute: 1440 });
  assert.deepEqual(getEventIntervalForAgendaDay(overnight, "2026-10-23"), { startMinute: 0, endMinute: 75 });
});

test("eixo começa em 06:00, termina em 23:00 e expande para eventos fora da faixa", () => {
  const normal = getAgendaTimelineRange([{ startMinute: 480, endMinute: 600 }]);
  assert.equal(normal.startMinute, 360);
  assert.equal(normal.endMinute, 1380);
  assert.deepEqual(getAgendaTimelineRange([{ startMinute: 290, endMinute: 1430 }]), {
    startMinute: 240,
    endMinute: 1440,
    ticks: Array.from({ length: 21 }, (_, index) => ({ minute: 240 + index * 60, label: index === 20 ? "24:00" : `${String(4 + index).padStart(2, "0")}:00` })),
  });
});

test("empilha eventos que se sobrepõem e reutiliza faixa quando não há conflito", () => {
  const events = [
    { id: "a", titulo: "A", inicio: "2026-10-22T12:00:00Z", fim: "2026-10-22T14:00:00Z", dia_inteiro: false },
    { id: "b", titulo: "B", inicio: "2026-10-22T13:00:00Z", fim: "2026-10-22T15:00:00Z", dia_inteiro: false },
    { id: "c", titulo: "C", inicio: "2026-10-22T14:00:00Z", fim: "2026-10-22T15:00:00Z", dia_inteiro: false },
  ];
  assert.deepEqual(layoutAgendaEvents(events, "2026-10-22").map((item) => [item.event.id, item.row]), [["a", 0], ["b", 1], ["c", 0]]);
});

test("posiciona os cartões proporcionalmente no eixo", () => {
  assert.deepEqual(positionOnAgendaAxis(540, 600, { startMinute: 360, endMinute: 1380 }), {
    leftPercent: 17.647058823529413,
    widthPercent: 5.88235294117647,
  });
});
