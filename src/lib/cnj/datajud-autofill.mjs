// Mapeamento puro DataJud -> campos do formulário "Solicitar novo processo" (sem Next/TS, testável).
// Regra: nunca sobrescreve o que o usuário digitou; só preenche campos vazios e remove os
// valores preenchidos antes pelo DataJud que o usuário não alterou (dados de outra consulta).

// Ordem dos TJs (J=8) e TREs (J=6), TR 01..27. Cópia de UF_ORDER em tribunais.ts (aquele é .ts e não importável daqui).
const UF_ORDER = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SE", "SP", "TO",
];

/** UF só para Justiça Estadual (8) e Eleitoral (6). TRF/TRT/superiores não têm UF única: devolve "". */
export function ufFromCnj(numeroCNJ) {
  const digits = String(numeroCNJ ?? "").replace(/\D/g, "");
  if (digits.length !== 20) return "";
  const j = digits.slice(13, 14);
  if (j !== "8" && j !== "6") return "";
  return UF_ORDER[Number(digits.slice(14, 16)) - 1] ?? "";
}

/**
 * Aceita ISO ("2020-05-12T00:00:00.000Z") ou compacto ("20200512000000"), formatos vistos no DataJud.
 * Usa o dia como veio (sem converter fuso). Devolve "aaaa-mm-dd" ou "".
 */
export function normalizeDataJudDate(value) {
  const text = String(value ?? "").trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text) ?? /^(\d{4})(\d{2})(\d{2})(?:\d{6})?$/.exec(text);
  if (!match) return "";
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  const real = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return real && year >= 1900 ? `${match[1]}-${match[2]}-${match[3]}` : "";
}

const plain = (text) => String(text ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/**
 * Classe processual -> grupo/tipo de ação do formulário (confiança média, só regras determinísticas).
 * Desconhecida ou ambígua (ex.: embargos): null, e o usuário escolhe.
 */
export function inferTipoAcao(classe) {
  const c = plain(classe);
  if (!c || c.startsWith("embargos")) return null;
  let tipoAcao = null;
  if (c.startsWith("cumprimento de sentenca")) tipoAcao = "Cumprimento de sentença";
  else if (c.startsWith("execucao")) tipoAcao = "Execução";
  else if (/^(apelacao|agravo|recurso)/.test(c)) tipoAcao = "Recurso";
  else if (/^(procedimento|acao)/.test(c)) tipoAcao = "Ação";
  return tipoAcao ? { grupoAcao: "contencioso", tipoAcao } : null;
}

/** Campos do formulário que o DataJud pode preencher -> nome em português para avisos. */
export const DATAJUD_FIELD_LABELS = {
  tribunal: "Tribunal",
  vara: "Órgão julgador / vara",
  uf: "UF",
  classeProcessual: "Classe processual",
  dataDistribuicao: "Data de distribuição",
  grupoAcao: "Grupo de ação",
  tipoAcao: "Tipo de ação",
};

const isEmpty = (v) => String(v ?? "").trim() === "";

/**
 * @param {Record<string, any>} form estado atual do formulário
 * @param {Record<string, string>} previous campo -> valor que o DataJud preencheu antes
 * @param {Record<string, any> | null} resultado resposta da rota (null = só limpar)
 * @returns {{ form: Record<string, any>, filled: Record<string, string>, sigilo: boolean }}
 */
export function applyDataJudAutofill(form, previous, resultado) {
  const next = { ...form };
  // Remove valores de consulta anterior que o usuário não editou.
  for (const [key, value] of Object.entries(previous ?? {})) {
    if (key !== "grupoAcao" && next[key] === value) next[key] = "";
  }
  // O grupo só sai se o tipo também saiu (evita tipo órfão sem grupo).
  if (previous?.grupoAcao && next.grupoAcao === previous.grupoAcao && isEmpty(next.tipoAcao)) next.grupoAcao = "";
  const sigilo = Number(resultado?.nivelSigilo ?? 0) > 0;
  const filled = {};
  if (!resultado || sigilo) return { form: next, filled, sigilo };

  const candidates = {
    tribunal: String(resultado.tribunal ?? "").trim(),
    vara: String(resultado.orgaoJulgador ?? "").trim(),
    uf: String(resultado.uf ?? "").trim().toUpperCase().slice(0, 2),
    classeProcessual: String(resultado.classe ?? "").trim(),
    dataDistribuicao: normalizeDataJudDate(resultado.dataAjuizamento),
  };
  // Grupo e tipo só mudam juntos e só se o usuário não escolheu nenhum dos dois.
  const tipo = isEmpty(next.grupoAcao) && isEmpty(next.tipoAcao) ? inferTipoAcao(resultado.classe) : null;
  if (tipo) Object.assign(candidates, tipo);

  for (const [key, value] of Object.entries(candidates)) {
    if (value && isEmpty(next[key])) {
      next[key] = value;
      filled[key] = value;
    }
  }
  return { form: next, filled, sigilo };
}
