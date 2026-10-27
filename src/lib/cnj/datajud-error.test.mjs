import assert from "node:assert/strict";
import test from "node:test";
import { dataJudConsultationGuidance } from "./datajud-error.mjs";

test("missing DataJud configuration explains that setup is server-wide and optional to the user", () => {
  const message = dataJudConsultationGuidance(503, "Integração CNJ não configurada");
  assert.match(message, /servidor/i);
  assert.match(message, /CNJ_DATAJUD_API_KEY/);
  assert.match(message, /não é uma conexão individual/i);
  assert.match(message, /cadastro sem o CNJ/i);
});

test("a process absent from the public index is not presented as a missing user connection", () => {
  const message = dataJudConsultationGuidance(404, "Processo não encontrado no DataJud");
  assert.match(message, /consulta pública do DataJud/i);
  assert.match(message, /cadastrá-lo sem o CNJ/i);
});

test("unclassified errors retain the existing API message", () => {
  assert.equal(dataJudConsultationGuidance(503, "Falha ao consultar API do CNJ."), null);
});

import { describeFailureForLog, dataJudUpstreamFailureMessage } from "./datajud-error.mjs";
import { DataJudError, searchDataJud } from "./datajud-search.mjs";

test("falha de rede: mensagem própria e log sem URL/chave", async () => {
  const fetchImpl = async () => {
    const e = new TypeError("fetch failed: https://x.test/api_publica_tjsp/_search");
    e.cause = { code: "ENOTFOUND" };
    throw e;
  };
  await assert.rejects(
    searchDataJud({ baseUrl: "https://x.test", apiKey: "segredo-xyz", alias: "tjsp", numeroCNJ: "0001234-56.2026.8.26.0001", fetchImpl }),
    (e) => {
      assert.ok(e instanceof DataJudError && e.kind === "network");
      const log = JSON.stringify(describeFailureForLog("datajud", e));
      assert.match(log, /ENOTFOUND/);
      assert.doesNotMatch(log, /segredo|x\.test/);
      return true;
    }
  );
  assert.match(dataJudUpstreamFailureMessage({ status: 0, kind: "network" }), /conectar/);
  assert.match(dataJudUpstreamFailureMessage({ status: 200, kind: "invalid_response" }), /formato inesperado/);
});

test("log de persistência marca etapa e remove URLs", () => {
  const log = describeFailureForLog("persistencia", new Error("boom https://db.test/x?k=1 fim"));
  assert.equal(log.stage, "persistencia");
  assert.doesNotMatch(log.message, /db\.test/);
});
