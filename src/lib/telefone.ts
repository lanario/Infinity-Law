/**
 * Telefone brasileiro: máscara, validação e montagem de link do WhatsApp.
 *
 * Utilizado nos formulários (máscara enquanto digita) e nos schemas de validação
 * no cliente e servidor para garantir integridade das informações de contato.
 */

export const DDI_BRASIL = "55";
export const DIGITOS_FIXO = 10;
export const DIGITOS_CELULAR = 11;
export const TAMANHO_MASCARA_TELEFONE = 15;
export const PLACEHOLDER_TELEFONE = "(11) 99999-9999";

export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

/**
 * Aplica "(DD) 90000-0000" conforme se digita, cortando o que passar de 11
 * dígitos. O separador funciona tanto para celular (9 dígitos após o DDD)
 * quanto para telefone fixo (8 dígitos).
 */
export function formatarTelefone(valor: string): string {
  const digitos = somenteDigitos(valor).slice(0, DIGITOS_CELULAR);
  if (digitos.length === 0) return "";
  if (digitos.length <= 2) return `(${digitos}`;

  const ddd = digitos.slice(0, 2);
  const resto = digitos.slice(2);
  if (resto.length <= 4) return `(${ddd}) ${resto}`;

  const corte = resto.length > 8 ? 5 : 4;
  return `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`;
}

/**
 * Retorna o número com DDI formatado para exibição.
 */
export function formatarTelefoneCompleto(valor: string): string {
  const digitos = somenteDigitos(valor);
  const nacional =
    digitos.startsWith(DDI_BRASIL) && digitos.length > DIGITOS_CELULAR
      ? digitos.slice(DDI_BRASIL.length)
      : digitos;
  return `+${DDI_BRASIL} ${formatarTelefone(nacional)}`;
}

export function telefoneValido(valor: string): boolean {
  return erroDoTelefone(valor) === null && somenteDigitos(valor).length >= DIGITOS_FIXO;
}

/**
 * Retorna a mensagem de erro, ou null caso o telefone seja válido ou vazio.
 */
export function erroDoTelefone(valor: string): string | null {
  const digitos = somenteDigitos(valor);
  if (digitos.length === 0) return null;

  if (digitos.length < DIGITOS_FIXO) {
    return "Número incompleto — informe o DDD e o número.";
  }

  const ddd = Number(digitos.slice(0, 2));
  if (ddd < 11 || ddd > 99) {
    return "DDD inválido — os DDDs brasileiros vão de 11 a 99.";
  }

  if (digitos.length === DIGITOS_CELULAR && digitos[2] !== "9") {
    return "Celular com 11 dígitos precisa do 9 após o DDD.";
  }

  return null;
}

export function linkDoWhatsApp(telefone: string, mensagem: string): string {
  const digitos = somenteDigitos(telefone);
  const comDdi =
    digitos.startsWith(DDI_BRASIL) && digitos.length > DIGITOS_CELULAR
      ? digitos
      : `${DDI_BRASIL}${digitos}`;
  return `https://wa.me/${comDdi}?text=${encodeURIComponent(mensagem)}`;
}
