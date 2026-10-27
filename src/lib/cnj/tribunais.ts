// Fonte única da tabela J.TR (Res. CNJ 65/2008) -> alias do índice DataJud (api_publica_<alias>).
// Puro e sem dependências: usado por cnj-validator.ts e testes. A edge function
// supabase/functions/cnj-sync/index.ts (Deno) mantém uma CÓPIA desta tabela; altere as duas juntas.
// Sintaxe apenas "apagável" (sem enums/parameter properties) para rodar no node:test.

// Ordem comum a TJ (J=8) e TRE (J=6): TR 01..27.
const UF_ORDER = [
  "ac", "al", "ap", "am", "ba", "ce", "dft", "es", "go", "ma", "mt", "ms", "mg", "pa",
  "pb", "pr", "pe", "pi", "rj", "rn", "rs", "ro", "rr", "sc", "se", "sp", "to",
];

const pad2 = (n: number) => String(n).padStart(2, "0");

function build(): Record<string, string> {
  const map: Record<string, string> = {
    "1.00": "stf",
    "3.00": "stj",
    "5.00": "tst",
    "6.00": "tse",
    "7.00": "stm",
    "9.13": "tjmmg",
    "9.21": "tjmrs",
    "9.26": "tjmsp",
  };
  UF_ORDER.forEach((uf, i) => {
    const tr = pad2(i + 1);
    map[`8.${tr}`] = uf === "dft" ? "tjdft" : `tj${uf}`;
    map[`6.${tr}`] = `tre-${uf}`;
  });
  for (let i = 1; i <= 6; i++) map[`4.${pad2(i)}`] = `trf${i}`;
  for (let i = 1; i <= 24; i++) map[`5.${pad2(i)}`] = `trt${i}`;
  // Auditorias da Justiça Militar da União (TR 01..12) compartilham o índice único "stm".
  for (let i = 1; i <= 12; i++) map[`7.${pad2(i)}`] = "stm";
  return map;
}

export const TRIBUNAL_ALIASES: Readonly<Record<string, string>> = Object.freeze(build());

/** J (1 dígito) + TR (2 dígitos) -> alias DataJud, ou null se não coberto. */
export function getTribunalAlias(j: number | string, tr: string): string | null {
  return TRIBUNAL_ALIASES[`${Number(j)}.${tr}`] ?? null;
}

/** Aceita número CNJ mascarado (NNNNNNN-DD.AAAA.J.TR.OOOO) ou só dígitos (20). */
export function aliasFromCnjNumber(numero: string): string | null {
  const digits = numero.replace(/\D/g, "");
  if (digits.length !== 20) return null;
  return getTribunalAlias(digits.slice(13, 14), digits.slice(14, 16));
}
