// Palavras-chave que destacam um movimento na linha do tempo (sem acento, minúsculas).
const PALAVRAS = ["sentenca", "citacao", "intimacao", "audiencia", "despacho", "decisao", "acordao", "transito em julgado", "penhora"];

const normalizar = (texto) => String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function movimentoEmDestaque(descricao) {
  const t = normalizar(descricao);
  return PALAVRAS.some((p) => t.includes(p));
}
