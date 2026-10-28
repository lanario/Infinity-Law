import assert from "node:assert/strict";
import test from "node:test";
import { PROCESSOS_LIST_SELECT, PROCESSOS_LIST_SELECT_SEM_HONORARIOS } from "./processos-list-select.mjs";

test("process list uses tenant-scoped foreign keys for ambiguous embeds", () => {
  assert.match(PROCESSOS_LIST_SELECT, /usuarios!processos_advogado_tenant_fkey\s*\(\s*nome\s*\)/);
  assert.match(PROCESSOS_LIST_SELECT, /honorarios!honorarios_processo_tenant_fkey\s*\(/);
  assert.match(
    PROCESSOS_LIST_SELECT,
    /processo_movimentacoes!processo_movimentacoes_processo_tenant_fkey\s*\(\s*data_hora,\s*data_movimento,\s*descricao\s*\)/
  );
});

test("select sem honorários remove só o embed de honorários", () => {
  assert.doesNotMatch(PROCESSOS_LIST_SELECT_SEM_HONORARIOS, /honorarios/);
  assert.match(
    PROCESSOS_LIST_SELECT_SEM_HONORARIOS,
    /processo_clientes \( papel, clientes \( id, nome \) \),\s*processo_movimentacoes!processo_movimentacoes_processo_tenant_fkey\s*\(\s*data_hora,\s*data_movimento,\s*descricao\s*\)\s*$/
  );
});
