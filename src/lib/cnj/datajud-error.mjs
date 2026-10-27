/**
 * Turns the consultation API's known failures into useful, accurate guidance.
 *
 * @param {number} status
 * @param {unknown} message
 * @returns {string | null} A replacement message, or null when the original is suitable.
 */
export function dataJudConsultationGuidance(status, message) {
  if (message === "Integração CNJ não configurada") {
    return "A consulta ao DataJud não está configurada neste sistema. Essa configuração é geral e fica no servidor; peça ao administrador para verificar a chave CNJ_DATAJUD_API_KEY. Não é uma conexão individual da sua conta. Você pode continuar o cadastro sem o CNJ se o processo ainda não foi distribuído.";
  }

  if (status === 404 && message === "Processo não encontrado no DataJud") {
    return "A consulta pública do DataJud não encontrou este processo. Confira o número e a distribuição; se o processo ainda não foi distribuído, você pode cadastrá-lo sem o CNJ e informar o número depois.";
  }

  return null;
}

/**
 * Mensagem amigável para falha do endpoint do DataJud (nunca confundir com "processo não encontrado").
 * Não expõe URL, chave nem corpo da resposta.
 *
 * @param {{ status?: number, kind?: string } | null | undefined} error
 * @returns {string}
 */
export function dataJudUpstreamFailureMessage(error) {
  const status = error?.status ?? 0;
  const kind = error?.kind;

  if (kind === "timeout") {
    return "A consulta ao DataJud demorou demais e foi interrompida. Tente novamente em alguns minutos.";
  }
  if (kind === "network") {
    return "O servidor não conseguiu se conectar ao DataJud. Isso pode ser a configuração CNJ_DATAJUD_BASE_URL/CNJ_DATAJUD_API_KEY ou uma falha de rede; avise o administrador.";
  }
  if (kind === "invalid_response") {
    return "O DataJud respondeu em um formato inesperado. Tente novamente em alguns minutos.";
  }
  if (status === 401 || status === 403) {
    return "O DataJud recusou a chave de acesso configurada no servidor. Peça ao administrador para verificar a chave CNJ_DATAJUD_API_KEY.";
  }
  if (status === 404) {
    return "O serviço do DataJud para este tribunal não respondeu como esperado (endpoint não encontrado). Isso não significa que o processo não exista; avise o administrador para verificar CNJ_DATAJUD_BASE_URL.";
  }
  if (status === 429) {
    return "O DataJud limitou as consultas neste momento. Aguarde um pouco antes de tentar novamente.";
  }
  if (status >= 500) {
    return "O DataJud está indisponível no momento. Tente novamente em alguns minutos.";
  }
  return "Falha ao consultar API do CNJ. Tente novamente em alguns minutos.";
}

export const PERSISTENCE_FAILURE_MESSAGE =
  "A consulta ao DataJud funcionou, mas não foi possível salvar o histórico no sistema.";

/**
 * Registro estruturado e seguro de falha (sem URL, chave, headers ou corpo).
 *
 * @param {"datajud" | "persistencia"} stage
 * @param {unknown} error
 */
export function describeFailureForLog(stage, error) {
  const e = /** @type {any} */ (error);
  const raw = e && typeof e === "object" ? String(e.message ?? "") : String(error ?? "");
  return {
    stage,
    name: e?.name ?? typeof error,
    kind: e?.kind,
    status: e?.status,
    detail: e?.detail || undefined,
    message: raw.replace(/https?:\/\/\S+/g, "[url]").slice(0, 200),
  };
}
