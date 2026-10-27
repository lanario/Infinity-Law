import { z } from "zod";
import { forcaDaSenha } from "@/lib/senha";
import {
  DIGITOS_CELULAR,
  DIGITOS_FIXO,
  erroDoTelefone,
  somenteDigitos as digitosDoTelefone,
} from "@/lib/telefone";

export const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido"),
  password: z.string().min(1, "Informe sua senha"),
  lembrarAcesso: z.boolean().optional().default(false),
});

const ACEITE_DOS_TERMOS = z.literal(true, {
  errorMap: () => ({ message: "É preciso aceitar os Termos de Uso e a Política de Privacidade" }),
});

export const SignupSchema = z
  .object({
    organizationName: z
      .string()
      .trim()
      .min(2, "Informe o nome do seu escritório")
      .max(120, "Nome muito longo"),
    nome: z
      .string()
      .trim()
      .min(3, "Informe seu nome completo")
      .max(120, "Nome muito longo")
      .refine((valor) => valor.split(/\s+/).length >= 2, "Informe nome e sobrenome"),
    telefone: z
      .string()
      .transform(digitosDoTelefone)
      .refine((digitos) => digitos.length >= DIGITOS_FIXO, "Informe o DDD e o número")
      .refine((digitos) => digitos.length <= DIGITOS_CELULAR, "Número longo demais")
      .refine((digitos) => erroDoTelefone(digitos) === null, "Telefone inválido"),
    email: z.string().trim().toLowerCase().email("Informe um e-mail válido"),
    password: z
      .string()
      .refine((senha) => forcaDaSenha(senha).aceitavel, "A senha não atende aos requisitos mínimos"),
    confirmarSenha: z.string().min(1, "Confirme sua senha"),
    aceiteDosTermos: ACEITE_DOS_TERMOS,
  })
  .refine((dados) => dados.password === dados.confirmarSenha, {
    message: "As senhas não conferem",
    path: ["confirmarSenha"],
  });

export type LoginInput = z.infer<typeof LoginSchema>;
export type SignupInput = z.infer<typeof SignupSchema>;
