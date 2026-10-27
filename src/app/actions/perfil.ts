"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { telefoneValido } from "@/lib/telefone";

const profileAvatarPathSchema = z.string().regex(
  /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(?:jpg|png|webp)$/i,
  "Arquivo de perfil inválido.",
);
function validarCPF(cpf: string): boolean {
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += Number(cpf[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== Number(cpf[9])) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += Number(cpf[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  return resto === Number(cpf[10]);
}

function dataDeNascimentoValida(value: string | null): boolean {
  if (!value) return true;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime())
    && date.toISOString().slice(0, 10) === value
    && value <= new Date().toISOString().slice(0, 10);
}

const profileDataSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome completo.").max(120, "O nome deve ter até 120 caracteres."),
  data_nascimento: z.string().transform((value) => value.trim() || null)
    .refine(dataDeNascimentoValida, "Informe uma data de nascimento válida."),
  sexo: z.enum(["masculino", "feminino", "outro"]).nullable(),
  cpf: z.string().transform((value) => value.replace(/\D/g, ""))
    .refine((value) => !value || validarCPF(value), "Informe um CPF válido."),
  telefone: z.string().transform((value) => value.replace(/\D/g, ""))
    .refine((value) => !value || telefoneValido(value), "Informe um telefone válido com DDD."),
}).strict();

export async function salvarDadosPessoaisPerfil(input: unknown): Promise<{ error: string } | { success: true }> {
  const parsed = profileDataSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revise os dados do perfil." };

  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Sua sessão expirou. Entre novamente para atualizar seu perfil." };

  const { error } = await supabase.rpc("salvar_dados_pessoais_perfil", {
    p_nome: parsed.data.nome,
    p_data_nascimento: parsed.data.data_nascimento ?? "",
    p_sexo: parsed.data.sexo ?? "",
    p_cpf: parsed.data.cpf,
    p_telefone: parsed.data.telefone,
  });

  if (error) {
    console.error("[salvarDadosPessoaisPerfil] Não foi possível atualizar os dados do perfil:", error);
    return { error: "Não foi possível salvar os dados do perfil. Tente novamente." };
  }

  return { success: true };
}

export async function salvarAvatarPerfil(input: unknown): Promise<{ error: string } | { success: true }> {
  const parsed = profileAvatarPathSchema.safeParse(input);
  if (!parsed.success) return { error: "Selecione uma imagem de perfil válida." };

  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Sua sessão expirou. Entre novamente para atualizar a foto." };

  if (!parsed.data.startsWith(`${user.id}/`)) {
    return { error: "Você só pode atualizar a imagem do seu próprio perfil." };
  }

  const { data: profile, error } = await supabase
    .from("usuarios")
    .update({ avatar_url: parsed.data })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  if (error || !profile) {
    console.error("[salvarAvatarPerfil] Não foi possível atualizar a imagem do perfil:", error);
    return { error: "Não foi possível salvar a imagem do perfil. Tente novamente." };
  }

  return { success: true };
}
