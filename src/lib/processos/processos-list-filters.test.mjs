import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveProcessClientOptions,
  filterProcessClientOptions,
  filterProcessList,
} from "./processos-list-filters.mjs";

const processes = [
  {
    id: "p1",
    status: "ativo",
    numero_cnj: "111",
    numero_protocolo: null,
    processo_originario: null,
    pasta_caso: "Família",
    grupo_acao: null,
    tipo_acao: "Divórcio",
    etapa: null,
    fase: null,
    tribunal: null,
    vara: null,
    observacoes: null,
    clientes: [
      { id: "c1", nome: "Ana Lima" },
      { id: "c2", nome: "Bruno Alves" },
    ],
  },
  {
    id: "p2",
    status: "suspenso",
    numero_cnj: "222",
    numero_protocolo: "protocolo-ana",
    processo_originario: null,
    pasta_caso: "Consumidor",
    grupo_acao: null,
    tipo_acao: "Indenização",
    etapa: null,
    fase: null,
    tribunal: null,
    vara: null,
    observacoes: null,
    clientes: [
      { id: "c1", nome: "Ana Lima" },
      { id: "c1", nome: "Ana Lima" },
    ],
  },
  {
    id: "p3",
    status: "ativo",
    numero_cnj: "333",
    numero_protocolo: null,
    processo_originario: null,
    pasta_caso: "Trabalhista",
    grupo_acao: null,
    tipo_acao: "Reclamação",
    etapa: null,
    fase: null,
    tribunal: null,
    vara: null,
    observacoes: null,
    clientes: [{ id: "c3", nome: "Carla Souza" }],
  },
];

test("derives distinct client choices and counts their related processes", () => {
  assert.deepEqual(deriveProcessClientOptions(processes), [
    { id: "c1", name: "Ana Lima", count: 2 },
    { id: "c2", name: "Bruno Alves", count: 1 },
    { id: "c3", name: "Carla Souza", count: 1 },
  ]);
});

test("filters client suggestions by the typed text and shows all for an empty query", () => {
  const clients = deriveProcessClientOptions(processes);

  assert.deepEqual(filterProcessClientOptions(clients, "   "), clients);
  assert.deepEqual(filterProcessClientOptions(clients, "ana"), [
    { id: "c1", name: "Ana Lima", count: 2 },
  ]);
});

test("filters the process list by selected client without replacing global search or status filters", () => {
  const result = filterProcessList(processes, {
    clientId: "c1",
    search: "protocolo-ana",
    status: "suspenso",
  });

  assert.deepEqual(result.map((process) => process.id), ["p2"]);
});

test("matches global process search while the client filter is selected", () => {
  const result = filterProcessList(processes, {
    clientId: "c1",
    search: "111",
    status: "todos",
  });

  assert.deepEqual(result.map((process) => process.id), ["p1"]);
});
