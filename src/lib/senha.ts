/**
 * Força da senha: critérios compartilhados entre o indicador visual da interface
 * e os schemas de validação no servidor.
 *
 * Dois requisitos são obrigatórios (tamanho e letras+números) e dois são
 * recomendados (maiúsculas/minúsculas e símbolo).
 */

export const MINIMO_SENHA = 8;
const TAMANHO_CONFORTAVEL = 12;

export interface RequisitoSenha {
  id: string;
  label: string;
  ok: boolean;
  obrigatorio: boolean;
}

export type NivelSenha = 0 | 1 | 2 | 3 | 4;

export interface ForcaDaSenha {
  nivel: NivelSenha;
  rotulo: string;
  cor: string;
  requisitos: RequisitoSenha[];
  aceitavel: boolean;
}

const ROTULOS: Record<NivelSenha, { rotulo: string; cor: string }> = {
  0: { rotulo: "—", cor: "#a3a3a3" },
  1: { rotulo: "Fraca", cor: "#f87171" },
  2: { rotulo: "Razoável", cor: "#fbbf24" },
  3: { rotulo: "Boa", cor: "#d4af37" },
  4: { rotulo: "Forte", cor: "#34d399" },
};

export function forcaDaSenha(senha: string): ForcaDaSenha {
  const temMinuscula = /[a-z]/.test(senha);
  const temMaiuscula = /[A-Z]/.test(senha);
  const temLetra = temMinuscula || temMaiuscula;
  const temNumero = /[0-9]/.test(senha);
  const temSimbolo = /[^A-Za-z0-9]/.test(senha);

  const requisitos: RequisitoSenha[] = [
    {
      id: "tamanho",
      label: `Pelo menos ${MINIMO_SENHA} caracteres`,
      ok: senha.length >= MINIMO_SENHA,
      obrigatorio: true,
    },
    {
      id: "alfanumerico",
      label: "Letras e números",
      ok: temLetra && temNumero,
      obrigatorio: true,
    },
    {
      id: "caixa",
      label: "Maiúsculas e minúsculas",
      ok: temMinuscula && temMaiuscula,
      obrigatorio: false,
    },
    {
      id: "simbolo",
      label: "Um símbolo (!, @, #...)",
      ok: temSimbolo,
      obrigatorio: false,
    },
  ];

  const atendidos = requisitos.filter((requisito) => requisito.ok).length;
  const aceitavel = requisitos.every((requisito) => !requisito.obrigatorio || requisito.ok);

  let nivel: NivelSenha = 0;
  if (senha.length > 0) {
    const bonus = senha.length >= TAMANHO_CONFORTAVEL && atendidos >= 3 ? 1 : 0;
    nivel = Math.max(1, Math.min(4, atendidos + bonus)) as NivelSenha;
  }

  return { nivel, ...ROTULOS[nivel], requisitos, aceitavel };
}

export function erroDaSenha(senha: string): string | null {
  if (senha.length === 0) return null;
  const forca = forcaDaSenha(senha);
  if (forca.aceitavel) return null;

  const faltando = forca.requisitos.find((requisito) => requisito.obrigatorio && !requisito.ok);
  return faltando ? `A senha precisa de: ${faltando.label.toLowerCase()}.` : "Senha muito fraca.";
}
