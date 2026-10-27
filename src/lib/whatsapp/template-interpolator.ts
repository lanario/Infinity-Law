// Interpola variáveis {{nome_variavel}} em templates de mensagem WhatsApp

export function interpolate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return variables[key] ?? match;
  });
}

// Extrai lista de variáveis de um template
export function extractVariables(template: string): string[] {
  const matches = Array.from(template.matchAll(/\{\{(\w+)\}\}/g));
  return Array.from(new Set(matches.map((m) => m[1]!)));
}

// Templates padrão do sistema (usados como seed inicial por escritório)
export const DEFAULT_TEMPLATES = [
  {
    nome: "Lembrete de Audiência",
    categoria: "agenda",
    corpo: "Olá, {{nome_cliente}}! Passando para lembrar da sua audiência marcada para {{data_audiencia}} às {{hora_audiencia}} na {{vara}}. Qualquer dúvida, entre em contato.",
  },
  {
    nome: "Cobrança de Honorários",
    categoria: "financeiro",
    corpo: "Olá, {{nome_cliente}}. Identificamos que a parcela de honorários referente ao processo {{numero_processo}} com vencimento em {{data_vencimento}} está em aberto. Por favor, entre em contato para regularizar.",
  },
  {
    nome: "Atualização de Processo",
    categoria: "processos",
    corpo: "Olá, {{nome_cliente}}. Há uma novidade no processo {{numero_processo}}: {{descricao_movimentacao}}. Entre em contato para mais detalhes.",
  },
  {
    nome: "Boas-vindas",
    categoria: "clientes",
    corpo: "Olá, {{nome_cliente}}! Seja bem-vindo(a) ao {{nome_escritorio}}. Estamos à disposição para auxiliar em tudo que precisar.",
  },
];
