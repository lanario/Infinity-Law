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
