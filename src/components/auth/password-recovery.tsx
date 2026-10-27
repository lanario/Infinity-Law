"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound, Loader2, Lock, Mail } from "lucide-react";
import { BotaoOlho, Campo, campoBase, campoComErro, campoNormal } from "@/components/auth/campos";
import { PasswordStrength } from "@/components/auth/password-strength";
import { TurnstileField } from "@/components/auth/turnstile-field";
import { Logo } from "@/components/ui/logo";
import { createClient } from "@/lib/supabase/client";
import { erroDaSenha, forcaDaSenha } from "@/lib/senha";
import { cn } from "@/lib/utils";

const captchaEnabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

function RecoveryShell({ children }: { children: ReactNode }) {
  return (
    <main className="auth-palco">
      <div aria-hidden="true" className="auth-ambiente">
        <div className="auth-brilho" />
        <div className="auth-malha" />
      </div>

      <Link
        href="/login"
        className="absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-[#2A2A2A] bg-[#121212]/80 px-3.5 py-2 text-xs text-[#A3A3A3] backdrop-blur transition-all hover:border-[#D4AF37]/50 hover:text-[#F5F5F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] sm:left-7 sm:top-7"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Voltar ao login
      </Link>

      <section className="relative z-[1] my-auto w-full max-w-[30rem] overflow-hidden rounded-[26px] border border-[#262626] bg-[#121212] shadow-[inset_0_1px_0_0_rgba(212,175,55,0.18),0_40px_90px_-50px_rgba(0,0,0,0.95),0_8px_30px_-20px_rgba(0,0,0,0.85)]">
        <div className="flex items-center justify-between gap-4 border-b border-[#262626] bg-gradient-to-br from-[#D4AF37]/[0.14] to-transparent px-5 py-5 sm:px-7">
          <Logo size="sm" />
          <span className="rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[#D4AF37]">
            Segurança da conta
          </span>
        </div>
        <div className="p-5 sm:p-7">{children}</div>
      </section>
    </main>
  );
}

export function PasswordRecoveryRequest() {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onTokenChange = useCallback((value: string | null) => setToken(value), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSent(false);

    if (captchaEnabled && !token) {
      setError("Conclua a verificação de segurança para continuar.");
      return;
    }

    setSending(true);
    try {
      const { error: requestError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/recuperar-senha`,
        ...(captchaEnabled && token ? { captchaToken: token } : {}),
      });

      if (requestError) {
        setError("Não foi possível enviar o link agora. Aguarde alguns minutos e tente novamente.");
        return;
      }

      setSent(true);
    } catch {
      setError("Não foi possível enviar o link agora. Aguarde alguns minutos e tente novamente.");
    } finally {
      setSending(false);
      setToken(null);
      setResetKey((key) => key + 1);
    }
  }

  return (
    <RecoveryShell>
      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-1.5">
          <h1 className="text-[1.65rem] font-semibold leading-tight tracking-tight text-[#F5F5F5]">
            Recuperar senha
          </h1>
          <p className="text-sm leading-relaxed text-[#A3A3A3]">
            Informe o e-mail da sua conta. Se ele estiver cadastrado, enviaremos um link para criar uma nova senha.
          </p>
        </div>

        {error && <p role="alert" className="rounded-xl border border-[#EF4444]/40 bg-[#EF4444]/10 px-3.5 py-2.5 text-sm text-[#EF4444]">{error}</p>}
        {sent && <p role="status" aria-live="polite" className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-2.5 text-sm leading-relaxed text-emerald-300">Se o endereço corresponder a uma conta, você receberá um e-mail com as instruções. Verifique também sua caixa de spam.</p>}

        <Campo id="recovery-email" label="E-mail" icone={Mail}>
          <input
            id="recovery-email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="voce@escritorio.com"
            autoComplete="email"
            required
            className={cn(campoBase, "pr-3", campoNormal)}
          />
        </Campo>

        <TurnstileField action="password_reset" onTokenChange={onTokenChange} resetKey={resetKey} />

        <button
          type="submit"
          disabled={sending || (captchaEnabled && !token)}
        className="auth-lustro flex w-full items-center justify-center gap-2 rounded-xl gold-sheen py-3 text-sm font-semibold text-[#0A0A0A] shadow-[0_10px_30px_-14px_rgba(212,175,55,0.7)] transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Mail className="h-4 w-4" aria-hidden="true" />}
          {sending ? "Enviando…" : captchaEnabled && !token ? "Aguardando verificação…" : "Enviar link de recuperação"}
        </button>

        <p className="text-center text-sm text-[#A3A3A3]">
          Lembrou sua senha? <Link href="/login" className="font-medium text-[#D4AF37] underline-offset-4 hover:underline">Entrar</Link>
        </p>
      </form>
    </RecoveryShell>
  );
}

type RecoveryState = "checking" | "ready" | "invalid" | "success";

export function PasswordRecoveryComplete() {
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState<RecoveryState>("checking");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session?.user && active) {
        setState("ready");
      }
    });

    const timeout = window.setTimeout(() => {
      if (active) setState((current) => current === "checking" ? "invalid" : current);
    }, 8000);

    return () => {
      active = false;
      window.clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const passwordError = erroDaSenha(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirmation) {
      setError("As senhas não são iguais.");
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError("O link pode ter expirado. Solicite uma nova recuperação e tente novamente.");
        return;
      }
      setState("success");
    } catch {
      setError("Não foi possível atualizar a senha. Solicite um novo link e tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <RecoveryShell>
      {state === "checking" && (
        <div role="status" aria-live="polite" className="flex items-center gap-3 py-5 text-sm text-[#A3A3A3]">
          <Loader2 className="h-5 w-5 animate-spin text-[#D4AF37]" aria-hidden="true" />
          Validando o link de recuperação…
        </div>
      )}

      {state === "invalid" && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <h1 className="text-[1.65rem] font-semibold leading-tight tracking-tight text-[#F5F5F5]">Link inválido ou expirado</h1>
            <p className="text-sm leading-relaxed text-[#A3A3A3]">Peça um novo link de recuperação. Por segurança, cada link pode ser usado uma única vez.</p>
          </div>
          <Link href="/esqueci-senha" className="auth-lustro flex w-full items-center justify-center gap-2 rounded-xl gold-sheen py-3 text-sm font-semibold text-[#0A0A0A] transition hover:opacity-95">
            <KeyRound className="h-4 w-4" aria-hidden="true" /> Solicitar novo link
          </Link>
        </div>
      )}

      {state === "ready" && (
        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-1.5">
            <h1 className="text-[1.65rem] font-semibold leading-tight tracking-tight text-[#F5F5F5]">Crie uma nova senha</h1>
            <p className="text-sm leading-relaxed text-[#A3A3A3]">Escolha uma senha que você ainda não usa em outro serviço.</p>
          </div>

          {error && <p role="alert" className="rounded-xl border border-[#EF4444]/40 bg-[#EF4444]/10 px-3.5 py-2.5 text-sm text-[#EF4444]">{error}</p>}

          <div>
            <Campo id="recovery-password" label="Nova senha" icone={Lock}>
              <input
                id="recovery-password"
                name="new-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                required
                aria-describedby="recovery-password-strength"
                className={cn(campoBase, "pr-11", campoNormal)}
              />
              <BotaoOlho visivel={showPassword} onToggle={() => setShowPassword((visible) => !visible)} rotulo="nova senha" />
            </Campo>
            <PasswordStrength senha={password} id="recovery-password-strength" />
          </div>

          <Campo id="recovery-confirmation" label="Confirme a nova senha" icone={Lock}>
            <input
              id="recovery-confirmation"
              name="confirm-password"
              type={showConfirmation ? "text" : "password"}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="new-password"
              required
              aria-invalid={confirmation.length > 0 && confirmation !== password}
              className={cn(campoBase, "pr-11", confirmation.length > 0 && confirmation !== password ? campoComErro : campoNormal)}
            />
            <BotaoOlho visivel={showConfirmation} onToggle={() => setShowConfirmation((visible) => !visible)} rotulo="confirmação da senha" />
          </Campo>
          <PasswordStrength senha={confirmation} comparar={password} compacto />

          <button
            type="submit"
            disabled={saving || !forcaDaSenha(password).aceitavel || password !== confirmation}
            className="auth-lustro flex w-full items-center justify-center gap-2 rounded-xl gold-sheen py-3 text-sm font-semibold text-[#0A0A0A] shadow-[0_10px_30px_-14px_rgba(212,175,55,0.7)] transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <KeyRound className="h-4 w-4" aria-hidden="true" />}
            {saving ? "Atualizando…" : "Atualizar senha"}
          </button>
        </form>
      )}

      {state === "success" && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <h1 className="text-[1.65rem] font-semibold leading-tight tracking-tight text-[#F5F5F5]">Senha atualizada</h1>
            <p role="status" className="text-sm leading-relaxed text-[#A3A3A3]">Sua nova senha já está ativa. Você pode continuar para o sistema.</p>
          </div>
          <Link href="/dashboard" className="auth-lustro flex w-full items-center justify-center gap-2 rounded-xl gold-sheen py-3 text-sm font-semibold text-[#0A0A0A] transition hover:opacity-95">
            Continuar para o Infinity Law
          </Link>
        </div>
      )}
    </RecoveryShell>
  );
}
