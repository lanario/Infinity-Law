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

// Mapeia código do tribunal para nome do endpoint DataJud
export function getTribunalEndpoint(numeroCNJ: string): string | null {
  const parsed = parseCNJ(numeroCNJ);
  if (!parsed) return null;

  const { j, tt } = parsed;

  // Justiça Estadual (J=8)
  if (j === 8) {
    const estadualMap: Record<string, string> = {
      "01": "tjac", "02": "tjal", "03": "tjap", "04": "tjam",
      "05": "tjba", "06": "tjce", "07": "tjdf", "08": "tjes",
      "09": "tjgo", "10": "tjma", "11": "tjmt", "12": "tjms",
      "13": "tjmg", "14": "tjpa", "15": "tjpb", "16": "tjpr",
      "17": "tjpe", "18": "tjpi", "19": "tjrj", "20": "tjrn",
      "21": "tjrs", "22": "tjro", "23": "tjrr", "24": "tjsc",
      "25": "tjse", "26": "tjsp", "27": "tjto",
    };
    return estadualMap[tt] ?? null;
  }

  // Justiça Federal (J=4)
  if (j === 4) {
    const federalMap: Record<string, string> = {
      "01": "trf1", "02": "trf2", "03": "trf3",
      "04": "trf4", "05": "trf5", "06": "trf6",
    };
    return federalMap[tt] ?? null;
  }

  // Tribunais superiores
  if (j === 1) return "stf";
  if (j === 3) return "stj";

  return null;
}
