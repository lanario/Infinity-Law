export type ContextoAuth = "login" | "signup" | "recuperacao";

type ErroAuth = { code?: string; message?: string; name?: string; status?: number } | null | undefined;

export const MARCADOR_ENV_SUPABASE = "SUPABASE_ENV_AUSENTE";

const MSG_PADRAO: Record<ContextoAuth, string> = {
  login: "Não foi possível entrar agora. Tente novamente em instantes.",
  signup: "Não foi possível concluir o cadastro. Verifique os dados e tente novamente.",
  recuperacao: "Não foi possível enviar o link agora. Aguarde alguns minutos e tente novamente.",
};

/**
 * Mapeia erros do Supabase Auth (ou exceções) para mensagens pt-BR seguras.
 * Nunca devolve message/stack internos. Quem chama deve registrar o erro original no servidor.
 */
export function mensagemDeErroAuth(erro: ErroAuth, contexto: ContextoAuth): string {
  const code = erro?.code ?? "";
  const msg = erro?.message ?? "";
  const nome = erro?.name ?? "";
  const status = erro?.status;

  if (msg.includes(MARCADOR_ENV_SUPABASE)) {
    return "O serviço de autenticação não está configurado. Avise a administração do sistema.";
  }
  if (
    nome === "AuthRetryableFetchError" ||
    status === 0 ||
    (typeof status === "number" && status >= 500) ||
    /fetch failed|failed to fetch|network|ECONN|ENOTFOUND|ETIMEDOUT|timed? ?out/i.test(msg)
  ) {
    return "Serviço de autenticação indisponível no momento. Verifique sua conexão e tente novamente em instantes.";
  }
  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit" || status === 429 || /rate limit|too many/i.test(msg)) {
    return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";
  }
  if (code === "user_banned" || /user (is )?banned/i.test(msg)) {
    return "Este acesso foi bloqueado ou desativado. Fale com a administração do escritório.";
  }
  if (contexto === "login") {
    if (code === "email_not_confirmed" || /email not confirmed/i.test(msg)) {
      return "Confirme seu e-mail antes de entrar.";
    }
    // Mensagem única: não revela se o e-mail existe.
    if (code === "invalid_credentials" || /invalid login credentials/i.test(msg)) {
      return "E-mail ou senha incorretos. Verifique suas credenciais.";
    }
  }
  if (contexto === "signup") {
    if (code === "email_exists" || code === "user_already_exists" || /already been registered|already exists/i.test(msg)) {
      return "Já existe uma conta com este e-mail. Entre com ela ou utilize outro e-mail.";
    }
    if (code === "weak_password" || /password/i.test(msg) && /weak|short|least/i.test(msg)) {
      return "A senha não atende aos requisitos de segurança. Escolha uma senha mais forte.";
    }
    if (code === "signup_disabled") {
      return "Novos cadastros estão desativados no momento. Fale com a administração do sistema.";
    }
  }
  return MSG_PADRAO[contexto];
}
