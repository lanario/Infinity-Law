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
