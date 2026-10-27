"use server";

import { cookies } from "next/headers";
import type { ZodError } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verificarTurnstile } from "@/lib/turnstile";
import {
  LoginSchema,
  SignupSchema,
} from "@/lib/validations/auth.schema";

const COOKIE_LEMBRAR_ACESSO = "infinity_law_lembrar";

function primeiraMensagemDeValidacao(erro: ZodError): string {
  return erro.issues[0]?.message ?? "Revise os dados enviados e tente novamente.";
}

function mensagemDoLogin(error: { code?: string; message: string }): string {
  const code = error.code ?? "";
  const msg = error.message ?? "";

  if (code === "invalid_credentials" || /invalid login credentials/i.test(msg)) {
    return "E-mail ou senha incorretos. Verifique suas credenciais.";
  }
  if (code === "email_not_confirmed" || /email not confirmed/i.test(msg)) {
    return "Confirme seu e-mail antes de entrar.";
  }
  if (code === "user_banned") {
    return "Este acesso foi bloqueado. Fale com a administração do escritório.";
  }
  if (code === "over_request_rate_limit" || /rate limit/i.test(msg)) {
    return "Muitas tentativas em pouco tempo. Aguarde alguns minutos.";
  }
  return "Não foi possível entrar. Confira o e-mail e a senha.";
}

function mensagemDaCriacao(error: { code?: string; message: string }): string {
  const codigo = error.code ?? "";
  const mensagem = error.message ?? "";

  if (codigo === "email_exists" || /already been registered|already exists/i.test(mensagem)) {
    return "Já existe uma conta com este e-mail. Entre com ela ou utilize outro e-mail.";
  }
  return "Não foi possível concluir o cadastro. Verifique os dados e tente novamente.";
}

export async function signIn(input: unknown): Promise<{ error?: string }> {
  const analisado = LoginSchema.safeParse(input);
  if (!analisado.success) {
    return { error: primeiraMensagemDeValidacao(analisado.error) };
  }
  const data = analisado.data;

  try {
    const turnstileValido = await verificarTurnstile(data.turnstileToken, "login");
    if (!turnstileValido) {
      return { error: "Não foi possível confirmar a verificação de segurança. Tente novamente." };
    }

    const cookieStore = cookies();
    cookieStore.set(COOKIE_LEMBRAR_ACESSO, data.lembrarAcesso ? "persistent" : "session", {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      ...(data.lembrarAcesso ? { maxAge: 60 * 60 * 24 * 365 } : {}),
    });

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      return { error: mensagemDoLogin(error) };
    }

    return {};
  } catch (err) {
    console.error("[signIn] Erro inesperado:", err);
    return { error: "Não foi possível entrar agora. Tente novamente em instantes." };
  }
}

export async function signUp(
  input: unknown
): Promise<{ error: string } | { entrou: boolean }> {
  const analisado = SignupSchema.safeParse(input);
  if (!analisado.success) {
    return { error: primeiraMensagemDeValidacao(analisado.error) };
  }
  const data = analisado.data;

  try {
    const turnstileValido = await verificarTurnstile(data.turnstileToken, "signup");
    if (!turnstileValido) {
      return { error: "Não foi possível confirmar a verificação de segurança. Tente novamente." };
    }

    let admin: ReturnType<typeof createAdminClient> | null = null;
    try {
      admin = createAdminClient();
    } catch {
      admin = null;
    }

    let userId: string | null = null;

    if (admin) {
      const { data: novoUsuario, error: erroAdmin } = await admin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: {
          nome: data.nome,
          telefone: data.telefone,
          escritorio_nome: data.organizationName,
          termos_aceitos_em: new Date().toISOString(),
        },
      });

      if (erroAdmin) {
        return { error: mensagemDaCriacao(erroAdmin) };
      }

      userId = novoUsuario.user?.id ?? null;
    } else {
      const supabase = createClient();
      const { data: novoUsuario, error: erroPadrao } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            nome: data.nome,
            telefone: data.telefone,
            escritorio_nome: data.organizationName,
            termos_aceitos_em: new Date().toISOString(),
          },
        },
      });

      if (erroPadrao) {
        return { error: mensagemDaCriacao(erroPadrao) };
      }

      userId = novoUsuario.user?.id ?? null;
    }

    if (!userId) {
      return { error: "Falha ao identificar o usuário criado. Tente novamente." };
    }

    // Provisiona o escritório e o vínculo do usuário em public.escritorios e public.usuarios
    if (admin) {
      // 1. Cria o escritório
      const { data: escritorio, error: erroEscritorio } = await admin
        .from("escritorios")
        .insert({
          nome: data.organizationName,
          plano: "starter",
          ativo: true,
        })
        .select("id")
        .single();

      if (erroEscritorio || !escritorio) {
        console.error("[signUp] Erro ao criar escritorio:", erroEscritorio);
        return { error: "Erro ao configurar escritório. Entre em contato com o suporte." };
      }

      // 2. Cria o cargo Administrador
      const { data: cargo } = await admin
        .from("cargos")
        .insert({
          escritorio_id: escritorio.id,
          nome: "Administrador",
          permissoes: {},
          is_admin: true,
        })
        .select("id")
        .single();

      // 3. Cria o registro na tabela usuarios
      const { error: erroUsuario } = await admin.from("usuarios").upsert({
        id: userId,
        escritorio_id: escritorio.id,
        cargo_id: cargo?.id ?? null,
        nome: data.nome,
        email: data.email,
        ativo: true,
      });

      if (erroUsuario) {
        console.error("[signUp] Erro ao vincular usuario ao escritorio:", erroUsuario);
      }
    }

    // Autentica a sessão do usuário
    const supabase = createClient();
    const { error: erroLogin } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (erroLogin) {
      return { entrou: false };
    }

    return { entrou: true };
  } catch (err) {
    console.error("[signUp] Erro inesperado:", err);
    return { error: "Não foi possível concluir o cadastro. Tente novamente em instantes." };
  }
}
