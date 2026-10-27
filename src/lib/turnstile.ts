export type TurnstileAction = "login" | "signup" | "invite" | "password_reset";

/**
 * Validação do Cloudflare Turnstile no servidor.
 * Sem chaves, só permite bypass quando NODE_ENV identifica explicitamente desenvolvimento.
 */
export async function verificarTurnstile(
  token: string | undefined,
  action: TurnstileAction
): Promise<boolean> {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const isDevelopment = process.env.NODE_ENV === "development";

  // Sem chaves, só há bypass no modo explicitamente identificado como desenvolvimento.
  if (!siteKey && !secret) return isDevelopment;

  // Token mock só é aceito em desenvolvimento e sem secret configurado.
  if (isDevelopment && token?.startsWith("dev-mock-") && !secret) return true;

  if (!siteKey || !secret || !token || token.length > 2048) return false;

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return false;

    const result: { success?: boolean; action?: string } = await response.json();
    return result.success === true && result.action === action;
  } catch {
    return false;
  }
}
