import assert from "node:assert/strict";
import test from "node:test";
import { failedQueryOperations, queryErrorGuidance, safeQueryErrorMetadata } from "./query-error-state.mjs";

test("successful empty rows and zero counts are not query failures", () => {
  assert.deepEqual(
    failedQueryOperations([
      { operation: "rows", data: [], error: null },
      { operation: "count", count: 0, error: null },
    ]),
    [],
  );
});

test("a query error remains a failure even when its data is empty", () => {
  assert.deepEqual(
    failedQueryOperations([
      { operation: "rows", data: [], error: { code: "08006" } },
      { operation: "count", count: 0, error: null },
    ]),
    ["rows"],
  );
});

test("safe diagnostic metadata excludes database messages and details", () => {
  assert.deepEqual(
    safeQueryErrorMetadata({
      code: "42501",
      status: 403,
      message: "permission denied for private table",
      details: "sensitive row data",
      hint: "SQL statement",
    }),
    { code: "42501", status: 403 },
  );
  assert.deepEqual(safeQueryErrorMetadata({ code: "unsafe code value", status: 999 }), { code: "unknown" });
});

test("missing schema fields guide the user to admin synchronization, not DataJud setup", () => {
  assert.deepEqual(
    queryErrorGuidance({
      code: "PGRST204",
      message: "Could not find the 'grupo_acao' column of 'processos' in the schema cache",
    }),
    {
      title: "A estrutura de dados precisa ser sincronizada",
      description: "Os campos ou relações esperados por esta tela não estão disponíveis no banco deste ambiente. Peça ao administrador para comparar e aplicar as migrations pendentes, especialmente 20261021213557_process_intake_fields.sql caso ainda não esteja aplicada, e atualizar o schema do Supabase. É um problema de sincronização do sistema, não uma conexão individual com CNJ/DataJud.",
      diagnosticCode: "PGRST204",
    },
  );
});

test("ambiguous PostgREST relationships do not suggest applying migrations", () => {
  assert.deepEqual(
    queryErrorGuidance({
      code: "PGRST201",
      message: "Could not embed because more than one relationship was found for 'processos' and 'usuarios'",
      details: "Candidates: processos_advogado_id_fkey, processos_advogado_tenant_fkey",
    }),
    {
      title: "A relação entre os dados é ambígua",
      description: "A consulta encontrou mais de um relacionamento possível entre tabelas. A equipe técnica precisa especificar qual vínculo usar antes que a listagem carregue. Tente novamente após o ajuste.",
      diagnosticCode: "PGRST201",
    },
  );
});

test("authorization errors give access guidance and generic failures keep a safe reference", () => {
  assert.match(queryErrorGuidance({ code: "42501" }).description, /administrador.*acesso/i);
  assert.deepEqual(queryErrorGuidance({ code: "08006" }), {
    title: "Não foi possível carregar os dados",
    description: "O servidor não conseguiu consultar os processos. Tente novamente; se o problema continuar, informe ao suporte o código técnico, se aparecer abaixo.",
    diagnosticCode: "08006",
  });
});
