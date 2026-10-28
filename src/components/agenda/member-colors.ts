// Cor estável por responsável (hash do id), independente de filtros ou ordem da lista.
const MEMBER_PALETTE = ["#0EA5E9", "#8B5CF6", "#F43F5E", "#10B981", "#F59E0B", "#14B8A6", "#EC4899", "#6366F1"];

export function getMemberColor(memberId: string | null) {
  if (!memberId) return "#A8A29E";
  let hash = 0;
  for (const char of memberId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return MEMBER_PALETTE[hash % MEMBER_PALETTE.length] ?? "#A8A29E";
}

// Fundo suave da coluna do responsável (cor + ~7% de opacidade).
export const memberTint = (color: string) => `${color}12`;
