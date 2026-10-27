export function createNovoProcessoFormDefaults(currentUserId) {
  return {
    partes: [],
    responsavelId: currentUserId ?? "",
    grupoAcao: "",
    tipoAcao: "",
    fase: "negociacao",
    etapa: "analise_do_caso",
    status: "ativo",
    areaDireitoId: "",
    numeroProtocolo: "",
    processoOriginario: "",
    pastaCaso: "",
    dataRequerimento: "",
    valorCausa: "",
    valorHonorarios: "",
    percentualHonorarios: "",
    contingenciamento: "nao",
    observacoes: "",
    tribunal: "",
    vara: "",
    uf: "",
    classeProcessual: "",
    dataDistribuicao: "",
    comarca: "",
    assunto: "",
    grau: "",
    sistema: "",
    parteContraria: "",
    advogadoParteContraria: "",
    // Preenchidos só pelo DataJud (sem campo editável).
    assuntoCodigo: "",
    classeCodigo: "",
    codigoMunicipioIbge: "",
    datajudAtualizadoEm: "",
  };
}

export function isNovoProcessoFormDirty(form, initialForm, numeroCNJ, resultado) {
  if (numeroCNJ !== "" || resultado !== null) return true;

  return Object.keys(initialForm).some((key) =>
    JSON.stringify(form[key]) !== JSON.stringify(initialForm[key]),
  );
}

/** @typedef {"partes" | "classificacao" | "identificacao" | "financeiro" | "anotacoes"} NovoProcessoSectionId */

/**
 * @param {NovoProcessoSectionId | null} currentSection
 * @param {NovoProcessoSectionId} requestedSection
 * @returns {NovoProcessoSectionId | null}
 */
export function toggleNovoProcessoAccordionSection(currentSection, requestedSection) {
  return currentSection === requestedSection ? null : requestedSection;
}

/**
 * @typedef {{
 *   message: string;
 *   sectionId: NovoProcessoSectionId;
 *   targetId?: string;
 *   targetSelector?: string;
 * }} NovoProcessoFormValidationIssue
 */

/**
 * @param {{
 *   partes: unknown[];
 *   valorCausa: string;
 *   valorHonorarios: string;
 *   percentualHonorarios: string;
 * }} form
 * @param {string} numeroCNJ
 * @param {boolean} cnjValido
 * @returns {NovoProcessoFormValidationIssue | null}
 */
export function getNovoProcessoFormValidationIssue(form, numeroCNJ, cnjValido) {
  if (numeroCNJ.trim() && !cnjValido) {
    return {
      message: "Confira o número CNJ ou deixe o campo em branco para informar depois.",
      sectionId: "identificacao",
      targetId: "numero-cnj",
    };
  }

  if (form.partes.length === 0) {
    return {
      message: "Selecione ao menos um cliente ou parte envolvida.",
      sectionId: "partes",
      targetSelector: "[aria-pressed]",
    };
  }

  const numericFields = [
    ["valor-causa", form.valorCausa],
    ["valor-honorarios", form.valorHonorarios],
    ["percentual-honorarios", form.percentualHonorarios],
  ];
  const invalidNumericField = numericFields.find(([, value]) =>
    value && !Number.isFinite(Number(value)),
  );

  if (invalidNumericField) {
    return {
      message: "Informe valores numéricos válidos para causa e honorários.",
      sectionId: "financeiro",
      targetId: invalidNumericField[0],
    };
  }

  const percentualHonorarios = form.percentualHonorarios
    ? Number(form.percentualHonorarios)
    : null;
  if (percentualHonorarios !== null && (percentualHonorarios < 0 || percentualHonorarios > 100)) {
    return {
      message: "O percentual de honorários deve ficar entre 0 e 100%.",
      sectionId: "financeiro",
      targetId: "percentual-honorarios",
    };
  }

  return null;
}
