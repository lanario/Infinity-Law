import assert from "node:assert/strict";
import test from "node:test";
import {
  isCalendarDate,
  normalizeCnjNumber,
  oabInputSchema,
  parseDjenResponse,
  toDjenDate,
  toSafeHttpUrl,
  validateDateRange,
} from "./validation.ts";

test("OAB keeps the submitted spelling and normalizes only surrounding whitespace and UF", () => {
  const result = oabInputSchema.parse({ numeroOab: " 123456-a ", ufOab: "sp" });
  assert.deepEqual(result, { numeroOab: "123456-a", ufOab: "SP" });
});

test("OAB accepts suffixes and separators but rejects a blank number or unknown UF", () => {
  assert.equal(oabInputSchema.safeParse({ numeroOab: "12.345/2020", ufOab: "RJ" }).success, true);
  assert.equal(oabInputSchema.safeParse({ numeroOab: "   ", ufOab: "RJ" }).success, false);
  assert.equal(oabInputSchema.safeParse({ numeroOab: "123A", ufOab: "XX" }).success, false);
});

test("CNJ matching normalizes separators and accepts only 20 digits", () => {
  assert.equal(normalizeCnjNumber("0001234-56.2025.8.26.0001"), "00012345620258260001");
  assert.equal(normalizeCnjNumber("1234-56"), null);
  assert.equal(normalizeCnjNumber(null), null);
});

test("date validation accepts the seven-day default and caps requests at 30 days", () => {
  assert.equal(validateDateRange("2026-10-15", "2026-10-21", "2026-10-21"), null);
  assert.match(
    validateDateRange("2026-09-21", "2026-10-21", "2026-10-21") ?? "",
    /30 dias/
  );
  assert.match(
    validateDateRange("2026-10-22", "2026-10-22", "2026-10-21") ?? "",
    /futuro/
  );
  assert.equal(isCalendarDate("2026-02-29"), false);
  assert.equal(isCalendarDate("2024-02-29"), true);
});

test("a valid empty DJEN response is distinct from malformed or failed responses", () => {
  assert.equal(parseDjenResponse({ status: "success", count: 0, items: [] }).count, 0);
  assert.throws(
    () => parseDjenResponse({ status: "success", count: 1, items: [] }),
    /quantidade informada/
  );
  assert.throws(
    () => parseDjenResponse({ status: "error", count: 0, items: [] }),
    /status desconhecido ou sem sucesso/
  );
  assert.throws(
    () => parseDjenResponse({ status: "processing", count: 0, items: [] }),
    /status desconhecido ou sem sucesso/
  );
  assert.throws(
    () => parseDjenResponse({ status: "success", count: 1, items: [{ numero_processo: "123" }] }),
    /formato esperado/
  );
});

test("publication values are reduced to safe date and HTTP(S) link values", () => {
  assert.equal(toDjenDate("2026-10-21T09:30:00Z"), "2026-10-21");
  assert.equal(toDjenDate("2026-02-30"), null);
  assert.equal(toSafeHttpUrl("https://pje.example.gov.br/comunicacao/1"), "https://pje.example.gov.br/comunicacao/1");
  assert.equal(toSafeHttpUrl("javascript:alert(1)"), null);
});
