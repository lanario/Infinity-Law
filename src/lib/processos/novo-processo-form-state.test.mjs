import assert from "node:assert/strict";
import test from "node:test";
import {
  createNovoProcessoFormDefaults,
  getNovoProcessoFormValidationIssue,
  isNovoProcessoFormDirty,
  toggleNovoProcessoAccordionSection,
} from "./novo-processo-form-state.mjs";

test("new process defaults are clean and preserve the current responsible user", () => {
  const initial = createNovoProcessoFormDefaults("user-1");

  assert.equal(initial.responsavelId, "user-1");
  assert.equal(isNovoProcessoFormDirty(initial, initial, "", null), false);
});

test("new process form becomes dirty when a field, party, CNJ, or lookup result changes", () => {
  const initial = createNovoProcessoFormDefaults("user-1");

  assert.equal(isNovoProcessoFormDirty({ ...initial, observacoes: "nota" }, initial, "", null), true);
  assert.equal(isNovoProcessoFormDirty({ ...initial, partes: [{ clienteId: "c1", papel: "autor" }] }, initial, "", null), true);
  assert.equal(isNovoProcessoFormDirty(initial, initial, "1234567-89.2026.1.00.0001", null), true);
  assert.equal(isNovoProcessoFormDirty(initial, initial, "", { numeroCNJ: "1234567-89.2026.1.00.0001" }), true);
});

test("restoring every field to its initial value clears the dirty state", () => {
  const initial = createNovoProcessoFormDefaults("user-1");

  assert.equal(
    isNovoProcessoFormDirty({ ...initial, fase: "conhecimento" }, initial, "", null),
    true,
  );
  assert.equal(isNovoProcessoFormDirty(initial, initial, "", null), false);
});

test("accordion state keeps at most one section open and allows closing the current section", () => {
  assert.equal(toggleNovoProcessoAccordionSection("partes", "classificacao"), "classificacao");
  assert.equal(toggleNovoProcessoAccordionSection("classificacao", "classificacao"), null);
  assert.equal(toggleNovoProcessoAccordionSection(null, "identificacao"), "identificacao");
});

test("form validation points invalid CNJ, missing parties, and invalid finance values to their sections", () => {
  const form = {
    partes: [{ clienteId: "cliente-1" }],
    valorCausa: "",
    valorHonorarios: "",
    percentualHonorarios: "",
  };

  assert.deepEqual(
    getNovoProcessoFormValidationIssue(form, "cnj-invalido", false),
    {
      message: "Confira o número CNJ ou deixe o campo em branco para informar depois.",
      sectionId: "identificacao",
      targetId: "numero-cnj",
    },
  );
  assert.deepEqual(
    getNovoProcessoFormValidationIssue({ ...form, partes: [] }, "", true),
    {
      message: "Selecione ao menos um cliente ou parte envolvida.",
      sectionId: "partes",
      targetSelector: "[aria-pressed]",
    },
  );
  assert.deepEqual(
    getNovoProcessoFormValidationIssue({ ...form, percentualHonorarios: "101" }, "", true),
    {
      message: "O percentual de honorários deve ficar entre 0 e 100%.",
      sectionId: "financeiro",
      targetId: "percentual-honorarios",
    },
  );
});
