import assert from "node:assert/strict";
import test from "node:test";
import { movimentoEmDestaque } from "./movimento-destaque.mjs";

test("destaca palavras-chave sem diferenciar caixa ou acento", () => {
  for (const d of ["Sentença proferida", "EXPEDIÇÃO DE CITAÇÃO", "intimacao", "Audiência designada", "Despacho", "Decisão interlocutória", "Acórdão publicado", "Trânsito em julgado", "Penhora de bens"]) {
    assert.equal(movimentoEmDestaque(d), true, d);
  }
});

test("não destaca movimento comum nem vazio", () => {
  assert.equal(movimentoEmDestaque("Juntada de petição"), false);
  assert.equal(movimentoEmDestaque(null), false);
});
