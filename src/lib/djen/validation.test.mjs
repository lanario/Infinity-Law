import assert from "node:assert/strict";
import test from "node:test";
import {
  BRAZILIAN_UFS,
  collectDjenPages,
  isCalendarDate,
  normalizeCnjNumber,
  oabInputSchema,
  parseDjenPage,
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

test("OAB aceita as 27 UFs (e rejeita a 28a)", () => {
  assert.equal(BRAZILIAN_UFS.length, 27);
  for (const uf of BRAZILIAN_UFS) {
    assert.equal(oabInputSchema.safeParse({ numeroOab: "123", ufOab: uf.toLowerCase() }).success, true, uf);
  }
  assert.equal(oabInputSchema.safeParse({ numeroOab: "123", ufOab: "ZZ" }).success, false);
});

const item = (n) => ({ hash: `h${n}` });
const page = (count, ids) => parseDjenPage({ status: "success", count, items: ids.map(item) });
const opts = { maxPages: 5, maxItems: 1000, deadline: Date.now() + 60_000 };

test("parseDjenPage aceita pagina parcial (count e o total)", () => {
  assert.equal(page(250, [1, 2]).items.length, 2);
  assert.throws(() => parseDjenPage({ status: "error", count: 0, items: [] }), /sem sucesso/);
});

test("paginacao: 1 pagina, varias paginas e vazia", async () => {
  const one = await collectDjenPages(async () => page(2, [1, 2]), opts);
  assert.deepEqual([one.count, one.items.length, one.truncated], [2, 2, false]);

  const data = { 1: [1, 2], 2: [3, 4], 3: [5] };
  const requested = [];
  const many = await collectDjenPages(async (p) => (requested.push(p), page(5, data[p])), opts);
  assert.deepEqual(requested, [1, 2, 3]);
  assert.deepEqual([many.items.length, many.truncated], [5, false]);

  const empty = await collectDjenPages(async () => page(0, []), opts);
  assert.equal(empty.items.length, 0);
});

test("paginacao: pagina vazia antes do total, pagina repetida e tetos", async () => {
  await assert.rejects(
    collectDjenPages(async (p) => (p === 1 ? page(5, [1, 2]) : page(5, [])), opts),
    /vazia antes do total/
  );
  await assert.rejects(collectDjenPages(async () => page(5, [1, 2]), opts), /não avançou/);

  const capped = await collectDjenPages(async (p) => page(100, [p * 2, p * 2 + 1]), { ...opts, maxPages: 3 });
  assert.deepEqual([capped.items.length, capped.truncated], [6, true]);

  const byItems = await collectDjenPages(async (p) => page(100, [p * 2, p * 2 + 1]), { ...opts, maxItems: 4 });
  assert.equal(byItems.truncated, true);

  const late = await collectDjenPages(async (p) => page(100, [p]), { ...opts, deadline: Date.now() - 1 });
  assert.deepEqual([late.items.length, late.truncated], [1, true]);
});
