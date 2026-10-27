"use client";

import { useState, type FormEvent, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Briefcase,
  Loader2,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { signUp } from "@/app/actions/auth";
import { TurnstileField } from "@/components/auth/turnstile-field";
import {
  BotaoOlho,
  Campo,
  campoBase,
  campoComErro,
  campoNormal,
  container,
  item,
} from "@/components/auth/campos";
import { PasswordStrength } from "@/components/auth/password-strength";
import { forcaDaSenha } from "@/lib/senha";
import {
  PLACEHOLDER_TELEFONE,
  TAMANHO_MASCARA_TELEFONE,
  erroDoTelefone,
  formatarTelefone,
  somenteDigitos as digitosDoTelefone,
} from "@/lib/telefone";
import { cn } from "@/lib/utils";

interface CadastroFormProps {
  /** Transiciona a lâmina para o lado de login no AuthPortal */
  aoTrocarParaLogin?: () => void;
  ativo?: boolean;
}

export function CadastroForm({ aoTrocarParaLogin, ativo = true }: CadastroFormProps) {
  const router = useRouter();
  const semMovimento = useReducedMotion();

  const [escritorio, setEscritorio] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [aceite, setAceite] = useState(false);

  const [verSenha, setVerSenha] = useState(false);
  const [verConfirmacao, setVerConfirmacao] = useState(false);

  const [tocados, setTocados] = useState<Record<string, boolean>>({});
  const [enviado, setEnviado] = useState(false);

  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [contaCriada, setContaCriada] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  const erros = {
    escritorio: escritorio.trim().length < 2 ? "Informe o nome do seu escritório" : null,
    nome:
      nome.trim().length === 0
        ? "Informe seu nome completo"
        : nome.trim().split(/\s+/).length < 2
          ? "Informe nome e sobrenome"
          : null,
    telefone:
      digitosDoTelefone(telefone).length === 0
        ? "Informe seu telefone"
        : erroDoTelefone(telefone),
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? null : "Informe um e-mail válido",
    confirmacao:
      confirmacao.length > 0 && confirmacao !== senha ? "As senhas não conferem" : null,
  };

  function visivel(campo: keyof typeof erros): string | null {
    if (!tocados[campo] && !enviado) return null;
    return erros[campo];
  }

  function tocar(campo: string) {
    setTocados((atual) => ({ ...atual, [campo]: true }));
  }

  const podeEnviar =
    !erros.escritorio &&
    !erros.nome &&
    !erros.telefone &&
    !erros.email &&
    forcaDaSenha(senha).aceitavel &&
    confirmacao === senha &&
    aceite;

  function irParaLogin(evento: MouseEvent<HTMLAnchorElement>) {
    if (!aoTrocarParaLogin) return;
    evento.preventDefault();
    aoTrocarParaLogin();
  }

  async function handleSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    setEnviado(true);

    if (!podeEnviar) {
      setErro("Revise os campos destacados antes de continuar.");
      return;
    }

    if (!turnstileToken) {
      setErro("Aguarde a verificação de segurança antes de criar a conta.");
      return;
    }

    setSalvando(true);
    const resultado = await signUp({
      organizationName: escritorio,
      nome,
      telefone,
      email,
      password: senha,
      confirmarSenha: confirmacao,
      aceiteDosTermos: aceite,
      turnstileToken: turnstileToken ?? undefined,
    });

    setTurnstileToken(null);
    setTurnstileResetKey((atual) => atual + 1);

    if ("error" in resultado) {
      setErro(resultado.error);
      setSalvando(false);
      return;
    }

    if (resultado.entrou) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setContaCriada(true);
    }
  }

  if (contaCriada) {
    return (
      <motion.div
        initial={semMovimento ? { opacity: 0 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="text-center py-6"
      >
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#34D399]/15 text-[#34D399]">
          <ShieldCheck className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-xl font-semibold text-[#F5F5F5]">
          Conta criada com sucesso
        </h2>
        <p className="mt-2 text-sm text-[#A3A3A3] max-w-sm mx-auto leading-relaxed">
          O escritório <strong className="text-[#F5F5F5]">{escritorio.trim()}</strong> está configurado. Acesse com{" "}
          <span className="text-[#D4AF37]">{email.trim()}</span> e a senha criada.
        </p>
        <Link
          href="/login"
          onClick={irParaLogin}
          className="mt-6 inline-flex items-center gap-2 rounded-xl gold-sheen px-5 py-2.5 text-sm font-semibold text-[#0A0A0A] transition-all hover:opacity-95"
        >
          Acessar minha conta
          <ArrowRight className="h-4 w-4" />
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      variants={container}
      initial="initial"
      animate="animate"
      className="space-y-4"
      noValidate
    >
      <motion.div variants={item} className="space-y-1">
        <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-[#F5F5F5]">
          Criar conta
        </h1>
        <p className="text-sm text-[#A3A3A3]">
          Comece a organizar sua advocacia hoje mesmo.
        </p>
      </motion.div>

      <AnimatePresence>
        {erro && (
          <motion.p
            role="alert"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="rounded-xl border border-[#EF4444]/40 bg-[#EF4444]/10 px-3.5 py-2.5 text-sm text-[#EF4444]"
          >
            {erro}
          </motion.p>
        )}
      </AnimatePresence>

      <Campo
        id="cadastro-escritorio"
        label="Nome do seu escritório"
        icone={Briefcase}
        erro={visivel("escritorio")}
        hint="Como o seu escritório será identificado no sistema."
      >
        <input
          id="cadastro-escritorio"
          value={escritorio}
          onChange={(evento) => setEscritorio(evento.target.value)}
          onBlur={() => tocar("escritorio")}
          placeholder="Ex: Barros Advocacia"
          autoComplete="organization"
          maxLength={120}
          aria-invalid={visivel("escritorio") ? true : undefined}
          className={cn(campoBase, "pr-3", visivel("escritorio") ? campoComErro : campoNormal)}
        />
      </Campo>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="cadastro-nome" label="Nome completo" icone={UserRound} erro={visivel("nome")}>
          <input
            id="cadastro-nome"
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
            onBlur={() => tocar("nome")}
            placeholder="Dr(a). Alan Barros"
            autoComplete="name"
            maxLength={120}
            aria-invalid={visivel("nome") ? true : undefined}
            className={cn(campoBase, "pr-3", visivel("nome") ? campoComErro : campoNormal)}
          />
        </Campo>

        <Campo
          id="cadastro-telefone"
          label="Telefone (WhatsApp)"
          icone={Phone}
          erro={visivel("telefone")}
          hint="Número com DDD."
        >
          <input
            id="cadastro-telefone"
            type="tel"
            inputMode="numeric"
            value={telefone}
            onChange={(evento) => setTelefone(formatarTelefone(evento.target.value))}
            onBlur={() => tocar("telefone")}
            placeholder={PLACEHOLDER_TELEFONE}
            maxLength={TAMANHO_MASCARA_TELEFONE}
            autoComplete="tel-national"
            aria-invalid={visivel("telefone") ? true : undefined}
            className={cn(campoBase, "pr-3", visivel("telefone") ? campoComErro : campoNormal)}
          />
        </Campo>
      </div>

      <Campo
        id="cadastro-email"
        label="E-mail"
        icone={Mail}
        erro={visivel("email")}
        hint="Será o seu e-mail de acesso principal."
      >
        <input
          id="cadastro-email"
          type="email"
          value={email}
          onChange={(evento) => setEmail(evento.target.value)}
          onBlur={() => tocar("email")}
          placeholder="contato@escritorio.com"
          autoComplete="email"
          aria-invalid={visivel("email") ? true : undefined}
          className={cn(campoBase, "pr-3", visivel("email") ? campoComErro : campoNormal)}
        />
      </Campo>

      <motion.div variants={item}>
        <label
          htmlFor="cadastro-senha"
          className="mb-1.5 block text-xs font-medium text-[#A3A3A3]"
        >
          Senha<span className="text-[#D4AF37]"> *</span>
        </label>
        <div className="relative">
          <Lock
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#737373]"
          />
          <input
            id="cadastro-senha"
            type={verSenha ? "text" : "password"}
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)}
            onBlur={() => tocar("senha")}
            placeholder="Crie uma senha forte"
            autoComplete="new-password"
            className={cn(campoBase, "pr-11", campoNormal)}
          />
          <BotaoOlho
            visivel={verSenha}
            onToggle={() => setVerSenha((atual) => !atual)}
            rotulo="senha"
          />
        </div>
        <PasswordStrength senha={senha} />
      </motion.div>

      <motion.div variants={item}>
        <label
          htmlFor="cadastro-confirmacao"
          className="mb-1.5 block text-xs font-medium text-[#A3A3A3]"
        >
          Confirmação da senha<span className="text-[#D4AF37]"> *</span>
        </label>
        <div className="relative">
          <Lock
            aria-hidden
            className={cn(
              "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2",
              visivel("confirmacao") ? "text-[#EF4444]" : "text-[#737373]"
            )}
          />
          <input
            id="cadastro-confirmacao"
            type={verConfirmacao ? "text" : "password"}
            value={confirmacao}
            onChange={(evento) => setConfirmacao(evento.target.value)}
            onBlur={() => tocar("confirmacao")}
            placeholder="Repita sua senha"
            autoComplete="new-password"
            aria-invalid={visivel("confirmacao") ? true : undefined}
            className={cn(campoBase, "pr-11", visivel("confirmacao") ? campoComErro : campoNormal)}
          />
          <BotaoOlho
            visivel={verConfirmacao}
            onToggle={() => setVerConfirmacao((atual) => !atual)}
            rotulo="confirmação da senha"
          />
        </div>
        <PasswordStrength senha={confirmacao} comparar={senha} compacto />
      </motion.div>

      <motion.div variants={item} className="space-y-1.5 pt-1">
        <div className="flex items-start gap-2.5">
          <label className="flex cursor-pointer items-start gap-2.5 text-xs text-[#A3A3A3]">
            <input
              type="checkbox"
              checked={aceite}
              onChange={(evento) => setAceite(evento.target.checked)}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border border-[#2A2A2A] bg-[#1A1A1A] transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#D4AF37] peer-checked:border-[#D4AF37] peer-checked:bg-[#D4AF37]"
            >
              {aceite && <ShieldCheck className="h-3 w-3 text-[#0A0A0A]" />}
            </span>
            <span>
              Li e concordo com os{" "}
              <Link
                href="/termos"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[#D4AF37] underline-offset-4 hover:underline"
              >
                Termos de Uso
              </Link>{" "}
              e a{" "}
              <Link
                href="/privacidade"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[#D4AF37] underline-offset-4 hover:underline"
              >
                Política de Privacidade
              </Link>
              .
            </span>
          </label>
        </div>
        {enviado && !aceite && (
          <p className="pl-6 text-[11px] text-[#EF4444]">
            É preciso aceitar os Termos e a Política para prosseguir.
          </p>
        )}
      </motion.div>

      <motion.div variants={item}>
        {ativo && (
          <TurnstileField
            action="signup"
            onTokenChange={setTurnstileToken}
            resetKey={turnstileResetKey}
          />
        )}
      </motion.div>

      <motion.button
        variants={item}
        type="submit"
        disabled={salvando}
        whileHover={salvando || semMovimento ? undefined : { scale: 1.015 }}
        whileTap={salvando || semMovimento ? undefined : { scale: 0.985 }}
        className="auth-lustro flex w-full items-center justify-center gap-2 rounded-xl gold-sheen py-3 text-sm font-semibold text-[#0A0A0A] shadow-[0_8px_24px_-12px_rgba(212,175,55,0.7)] transition-all hover:opacity-95 disabled:opacity-50"
      >
        {salvando ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ShieldCheck className="h-4 w-4" />
        )}
        {salvando ? "Criando sua conta..." : "Criar minha conta"}
      </motion.button>

      <motion.p variants={item} className="text-center text-xs text-[#A3A3A3] pt-1">
        Você entrará como gestor do escritório e poderá convidar sua equipe depois. Já tem conta?{" "}
        <Link
          href="/login"
          onClick={irParaLogin}
          className="font-medium text-[#D4AF37] underline-offset-4 hover:underline hover:opacity-90"
        >
          Entrar
        </Link>
      </motion.p>
    </motion.form>
  );
}
