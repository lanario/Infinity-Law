import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDataJudSearchUrl,
  DataJudError,
  searchDataJud,
  toDataJudNumber,
} from "./datajud-search.mjs";
import { dataJudUpstreamFailureMessage, describeFailureForLog } from "./datajud-error.mjs";

const NUM = "0001234-56.2025.8.26.0001";
const base = { baseUrl: "https://api.example.test/", apiKey: "segredo-xyz", alias: "tjsp", numeroCNJ: NUM, delayMs: 1 };
const json = (status, body) => new Response(JSON.stringify(body), { status });

test("URL: formato api_publica_<alias>/_search sem barras duplicadas", () => {
  assert.equal(buildDataJudSearchUrl("https://x.test", "tjsp"), "https://x.test/api_publica_tjsp/_search");
  assert.equal(buildDataJudSearchUrl("https://x.test///", "tre-sp"), "https://x.test/api_publica_tre-sp/_search");
});

test("numero e normalizado para 20 digitos", () => {
  assert.equal(toDataJudNumber(NUM), "00012345620258260001");
  assert.equal(toDataJudNumber("123"), null);
});

test("200 com hit: envia URL, ApiKey e numero sem mascara; devolve _source", async () => {
  let seen;
  const fetchImpl = async (url, init) => {
    seen = { url, init };
    return json(200, { hits: { hits: [{ _source: { tribunal: "TJSP" } }] } });
  };
  const out = await searchDataJud({ ...base, fetchImpl });
  assert.deepEqual(out, { tribunal: "TJSP" });
  assert.equal(seen.url, "https://api.example.test/api_publica_tjsp/_search");
  assert.equal(seen.init.headers.Authorization, "APIKey segredo-xyz");
  const sent = JSON.parse(seen.init.body);
  assert.equal(sent.query.match.numeroProcesso, "00012345620258260001");
  assert.equal(sent.size, 1);
  assert.ok(sent._source.includes("movimentos"));
});

test("200 com hits vazios = nao encontrado (null)", async () => {
  const out = await searchDataJud({ ...base, fetchImpl: async () => json(200, { hits: { hits: [] } }) });
  assert.equal(out, null);
});

for (const status of [404, 401, 403, 500]) {
  test(`${status} vira erro explicito, nunca null`, async () => {
    await assert.rejects(
      searchDataJud({ ...base, fetchImpl: async () => json(status, {}) }),
      (e) => e instanceof DataJudError && e.status === status && e.kind === "http" && !/segredo/.test(e.message)
    );
  });
}

test("429: retenta e sucede; persistente vira erro 429", async () => {
  let calls = 0;
  const ok = await searchDataJud({
    ...base,
    fetchImpl: async () => (++calls < 2 ? json(429, {}) : json(200, { hits: { hits: [{ _source: { a: 1 } }] } })),
  });
  assert.deepEqual(ok, { a: 1 });
  assert.equal(calls, 2);

  calls = 0;
  await assert.rejects(
    searchDataJud({ ...base, fetchImpl: async () => (calls++, json(429, {})) }),
    (e) => e.status === 429
  );
  assert.equal(calls, 3);
});

test("timeout e corpo invalido viram erro tipado", async () => {
  await assert.rejects(
    searchDataJud({
      ...base,
      fetchImpl: async () => {
        throw new DOMException("t", "TimeoutError");
      },
    }),
    (e) => e.kind === "timeout"
  );
  await assert.rejects(
    searchDataJud({ ...base, fetchImpl: async () => json(200, { foo: 1 }) }),
    (e) => e.kind === "invalid_response"
  );
});

test("mensagens amigaveis por status, sem segredos", () => {
  assert.match(dataJudUpstreamFailureMessage({ status: 404, kind: "http" }), /endpoint não encontrado/);
  assert.match(dataJudUpstreamFailureMessage({ status: 401, kind: "http" }), /CNJ_DATAJUD_API_KEY/);
  assert.match(dataJudUpstreamFailureMessage({ status: 429, kind: "http" }), /limitou/);
  assert.match(dataJudUpstreamFailureMessage({ status: 503, kind: "http" }), /indisponível/);
  assert.match(dataJudUpstreamFailureMessage({ status: 0, kind: "timeout" }), /demorou[\s\S]*lentidão[\s\S]*cadastrar/);
});

test("timeout real dentro do orcamento: kind timeout com elapsedMs e alias, log sem segredo", async () => {
  const fetchImpl = (url, init) =>
    new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason)));
  await assert.rejects(
    searchDataJud({ ...base, fetchImpl, totalBudgetMs: 50 }),
    (e) => {
      const log = JSON.stringify(describeFailureForLog("datajud", e));
      assert.equal(e.kind, "timeout");
      assert.equal(e.alias, "tjsp");
      assert.ok(e.elapsedMs >= 40);
      assert.match(log, /"elapsedMs":\d+/);
      assert.match(log, /"alias":"tjsp"/);
      assert.ok(!/segredo|api\.example/.test(log));
      return true;
    }
  );
});

test("resposta lenta mas dentro do orcamento tem sucesso", async () => {
  const fetchImpl = async () => {
    await new Promise((r) => setTimeout(r, 60));
    return json(200, { hits: { hits: [{ _source: { a: 1 } }] } });
  };
  assert.deepEqual(await searchDataJud({ ...base, fetchImpl, totalBudgetMs: 2_000 }), { a: 1 });
});
