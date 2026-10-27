import assert from "node:assert/strict";
import test from "node:test";
import {
  applyDataJudAutofill,
  inferTipoAcao,
  normalizeDataJudDate,
  ufFromCnj,
} from "./datajud-autofill.mjs";

const empty = {
  tribunal: "", vara: "", uf: "", classeProcessual: "", dataDistribuicao: "", grupoAcao: "", tipoAcao: "",
};
const resultado = {
  tribunal: "TJSP",
  orgaoJulgador: "1ª Vara Cível",
  uf: "SP",
  classe: "Procedimento Comum Cível",
  dataAjuizamento: "2023-04-05T00:00:00.000Z",
  nivelSigilo: 0,
};

test("data: ISO, compacta e inválidas", () => {
  assert.equal(normalizeDataJudDate("2023-04-05T00:00:00.000Z"), "2023-04-05");
  assert.equal(normalizeDataJudDate("20230405123000"), "2023-04-05");
  assert.equal(normalizeDataJudDate("2023-02-30T00:00:00Z"), "");
  assert.equal(normalizeDataJudDate(""), "");
  assert.equal(normalizeDataJudDate(undefined), "");
  assert.equal(normalizeDataJudDate("05/04/2023"), "");
});

test("UF só para Justiça Estadual e Eleitoral", () => {
  assert.equal(ufFromCnj("0001234-56.2025.8.26.0001"), "SP");
  assert.equal(ufFromCnj("0001234-56.2025.8.07.0001"), "DF");
  assert.equal(ufFromCnj("0001234-56.2025.6.13.0001"), "MG");
  assert.equal(ufFromCnj("0001234-56.2025.4.03.0001"), "");
  assert.equal(ufFromCnj("0001234-56.2025.5.02.0001"), "");
  assert.equal(ufFromCnj("lixo"), "");
});

test("classe -> tipo de ação (determinístico) ou null", () => {
  assert.deepEqual(inferTipoAcao("Procedimento Comum Cível"), { grupoAcao: "contencioso", tipoAcao: "Ação" });
  assert.deepEqual(inferTipoAcao("Cumprimento de Sentença"), { grupoAcao: "contencioso", tipoAcao: "Cumprimento de sentença" });
  assert.equal(inferTipoAcao("Execução Fiscal").tipoAcao, "Execução");
  assert.equal(inferTipoAcao("Apelação Cível").tipoAcao, "Recurso");
  assert.equal(inferTipoAcao("Agravo de Instrumento").tipoAcao, "Recurso");
  assert.equal(inferTipoAcao("Embargos de Terceiro"), null);
  assert.equal(inferTipoAcao("Carta Precatória Cível"), null);
  assert.equal(inferTipoAcao(""), null);
});

test("preenche campos vazios e informa o que veio do DataJud", () => {
  const out = applyDataJudAutofill(empty, {}, resultado);
  assert.equal(out.form.tribunal, "TJSP");
  assert.equal(out.form.vara, "1ª Vara Cível");
  assert.equal(out.form.uf, "SP");
  assert.equal(out.form.classeProcessual, "Procedimento Comum Cível");
  assert.equal(out.form.dataDistribuicao, "2023-04-05");
  assert.equal(out.form.grupoAcao, "contencioso");
  assert.equal(out.form.tipoAcao, "Ação");
  assert.equal(Object.keys(out.filled).length, 7);
});

test("nunca sobrescreve o que o usuário preencheu", () => {
  const typed = { ...empty, tribunal: "Meu tribunal", grupoAcao: "consultivo" };
  const out = applyDataJudAutofill(typed, {}, resultado);
  assert.equal(out.form.tribunal, "Meu tribunal");
  assert.equal(out.form.grupoAcao, "consultivo");
  assert.equal(out.form.tipoAcao, "");
  assert.equal(out.filled.tribunal, undefined);
  assert.equal(out.filled.tipoAcao, undefined);
  assert.equal(out.form.vara, "1ª Vara Cível");
});

test("campos vazios no DataJud não preenchem nada", () => {
  const out = applyDataJudAutofill(empty, {}, { tribunal: "", classe: "", orgaoJulgador: "", uf: "", dataAjuizamento: "x" });
  assert.deepEqual(out.form, empty);
  assert.deepEqual(out.filled, {});
});

test("nova consulta limpa o que veio antes e não foi editado; preserva edição", () => {
  const first = applyDataJudAutofill(empty, {}, resultado);
  const edited = { ...first.form, vara: "Vara editada" };
  const out = applyDataJudAutofill(edited, first.filled, { ...resultado, tribunal: "TJRJ", orgaoJulgador: "2ª Vara", uf: "RJ" });
  assert.equal(out.form.tribunal, "TJRJ");
  assert.equal(out.form.vara, "Vara editada");
  assert.equal(out.form.uf, "RJ");
});

test("tipo editado pelo usuário mantém o grupo", () => {
  const first = applyDataJudAutofill(empty, {}, resultado);
  const edited = { ...first.form, tipoAcao: "Defesa" };
  const out = applyDataJudAutofill(edited, first.filled, null);
  assert.equal(out.form.tipoAcao, "Defesa");
  assert.equal(out.form.grupoAcao, "contencioso");
});

test("sigilo > 0: não preenche, limpa o anterior não editado e sinaliza", () => {
  const first = applyDataJudAutofill(empty, {}, resultado);
  const out = applyDataJudAutofill(first.form, first.filled, { ...resultado, nivelSigilo: 2 });
  assert.equal(out.sigilo, true);
  assert.deepEqual(out.form, empty);
  assert.deepEqual(out.filled, {});
});
