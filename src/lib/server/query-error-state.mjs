/**
 * @typedef {{ operation: string, error?: unknown | null }} QueryOperationResult
 */

/**
 * Returns the names of failed operations without treating valid empty data as failure.
 *
 * @param {readonly QueryOperationResult[]} results
 * @returns {string[]}
 */
export function failedQueryOperations(results) {
  return results
    .filter((result) => result.error !== null && result.error !== undefined)
    .map((result) => result.operation);
}

/**
 * Keep logs useful for diagnosis while excluding database messages, hints and details,
 * which can contain SQL, values, or personal information.
 *
 * @param {unknown} error
 * @returns {{ code: string, status?: number }}
 */
export function safeQueryErrorMetadata(error) {
  if (error === null || typeof error !== "object") return { code: "unknown" };

  const candidate = /** @type {{ code?: unknown, status?: unknown }} */ (error);
  const code = typeof candidate.code === "string" && /^[A-Za-z0-9_-]{1,16}$/.test(candidate.code)
    ? candidate.code
    : "unknown";
  const status = typeof candidate.status === "number"
    && Number.isInteger(candidate.status)
    && candidate.status >= 100
    && candidate.status <= 599
    ? candidate.status
    : undefined;

  return status === undefined ? { code } : { code, status };
}

/**
 * Provides actionable, user-safe guidance for a failed server query.
 * Database messages are inspected only for classification and are never returned.
 *
 * @param {unknown} error
 * @returns {{ title: string, description: string, diagnosticCode?: string }}
 */
export function queryErrorGuidance(error) {
  const metadata = safeQueryErrorMetadata(error);
  const source = error !== null && typeof error === "object"
    ? /** @type {{ message?: unknown, details?: unknown, hint?: unknown }} */ (error)
    : {};
  const searchableText = [source.message, source.details, source.hint]
    .filter((value) => typeof value === "string")
    .join(" ")
    .toLowerCase();
  const ambiguousRelationship = metadata.code === "PGRST201"
    || /ambiguous relationship|more than one relationship|multiple relationships/.test(searchableText);
  const schemaCodes = new Set(["PGRST200", "PGRST204", "PGRST205", "42703", "42P01"]);
  const schemaMessage = /schema cache|column .* (?:does not exist|was not found)|relation .* does not exist|no relationship between .* found/.test(searchableText);
  const diagnosticCode = metadata.code === "unknown" ? undefined : metadata.code;

  if (ambiguousRelationship) {
    return {
      title: "A relação entre os dados é ambígua",
      description: "A consulta encontrou mais de um relacionamento possível entre tabelas. A equipe técnica precisa especificar qual vínculo usar antes que a listagem carregue. Tente novamente após o ajuste.",
      ...(diagnosticCode ? { diagnosticCode } : {}),
    };
  }

  if (schemaCodes.has(metadata.code) || schemaMessage) {
    return {
      title: "A estrutura de dados precisa ser sincronizada",
      description: "Os campos ou relações esperados por esta tela não estão disponíveis no banco deste ambiente. Peça ao administrador para comparar e aplicar as migrations pendentes, especialmente 20261021213557_process_intake_fields.sql caso ainda não esteja aplicada, e atualizar o schema do Supabase. É um problema de sincronização do sistema, não uma conexão individual com CNJ/DataJud.",
      ...(diagnosticCode ? { diagnosticCode } : {}),
    };
  }

  if (metadata.code === "42501" || metadata.status === 401 || metadata.status === 403) {
    return {
      title: "Acesso aos processos não autorizado",
      description: "Atualize a página para renovar sua sessão. Se o problema continuar, peça ao administrador para conferir seu acesso ao módulo Processos e ao escritório correto.",
      ...(diagnosticCode ? { diagnosticCode } : {}),
    };
  }

  return {
    title: "Não foi possível carregar os dados",
    description: "O servidor não conseguiu consultar os processos. Tente novamente; se o problema continuar, informe ao suporte o código técnico, se aparecer abaixo.",
    ...(diagnosticCode ? { diagnosticCode } : {}),
  };
}

/**
 * @param {string} pageName A fixed, non-user-controlled page label.
 * @param {readonly QueryOperationResult[]} results
 */
export function logQueryFailures(pageName, results) {
  for (const result of results) {
    if (result.error === null || result.error === undefined) continue;
    console.error(`[${pageName}] Query failed: ${result.operation}`, safeQueryErrorMetadata(result.error));
  }
}
