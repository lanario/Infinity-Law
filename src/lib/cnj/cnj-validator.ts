import { getTribunalAlias } from "./tribunais";

const CNJ_REGEX = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;

export function validateCNJ(input: string): { valid: boolean; normalized: string | null } {
  const normalized = input.trim();
  if (!CNJ_REGEX.test(normalized)) {
    return { valid: false, normalized: null };
  }
  return { valid: true, normalized };
}

// Extrai segmentos do número CNJ
// Formato: NNNNNNN-DD.AAAA.J.TT.OOOO
// J = 1 (STF), 2 (CNJ), 3 (STJ), 4 (JF), 5 (TRT), 6 (TRE), 7 (STM), 8 (TJ), 9 (TJMSP)
export function parseCNJ(numeroCNJ: string) {
  const match = numeroCNJ.match(/^(\d{7})-(\d{2})\.(\d{4})\.(\d)\.(\d{2})\.(\d{4})$/);
  if (!match) return null;

  const [, nnnnnnn, dd, aaaa, j, tt, oooo] = match;
  return {
    nnnnnnn: nnnnnnn!,
    dd: parseInt(dd!),
    aaaa: parseInt(aaaa!),
    j: parseInt(j!),
    tt: tt!,
    oooo: oooo!,
    segmento: parseInt(j!),
    tribunal: tt!,
    ano: parseInt(aaaa!),
  };
}

// Mapeia o número CNJ para o alias do índice DataJud (tabela em ./tribunais).
export function getTribunalEndpoint(numeroCNJ: string): string | null {
  const parsed = parseCNJ(numeroCNJ);
  if (!parsed) return null;
  return getTribunalAlias(parsed.j, parsed.tt);
}
