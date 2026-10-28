"use client";

import { useEffect, useState, type FormEvent, type MouseEvent } from "react";
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

export function CadastroForm({ aoTrocarParaLogin }: CadastroFormProps) {
  const router = useRouter();
  const semMovimento = useReducedMotion();

  useEffect(() => {
    router.prefetch("/dashboard");
  }, [router]);

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

    setSalvando(true);
    let resultado: Awaited<ReturnType<typeof signUp>>;
    try {
      resultado = await signUp({
        organizationName: escritorio,
        nome,
        telefone,
        email,
        password: senha,
        confirmarSenha: confirmacao,
        aceiteDosTermos: aceite,
      });
    } catch {
      resultado = { error: "Falha de conexão com o servidor. Verifique sua internet e tente novamente." };
    }

    if ("error" in resultado) {
      setErro(resultado.error);
      setSalvando(false);
      return;
    }

    if (resultado.entrou) {
      router.push("/dashboard");
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
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#DCFCE7] text-[#157347]">
          <ShieldCheck className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-xl font-semibold text-[#17191A]">
          Conta criada com sucesso
        </h2>
        <p className="mt-2 text-sm text-[#5C6367] max-w-sm mx-auto leading-relaxed">
          O escritório <strong className="text-[#17191A]">{escritorio.trim()}</strong> está configurado. Acesse com{" "}
          <span className="text-[#805F11]">{email.trim()}</span> e a senha criada.
        </p>
        <Link
          href="/login"
          onClick={irParaLogin}
          className="auth-lustro mt-6 inline-flex items-center gap-2 rounded-xl gold-sheen px-5 py-2.5 text-sm font-semibold text-[#17191A] transition-all hover:opacity-95"
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
        <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-[#17191A]">
          Criar conta
        </h1>
        <p className="text-sm text-[#5C6367]">
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
            className="rounded-xl border border-[#FDA29B] bg-[#FEF3F2] px-3.5 py-2.5 text-sm text-[#B42318]"
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
          className="mb-1.5 block text-xs font-medium text-[#4D5559]"
        >
          Senha<span className="text-[#805F11]"> *</span>
        </label>
        <div className="relative">
          <Lock
            aria-hidden
            className="auth-field-icon pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
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
          className="mb-1.5 block text-xs font-medium text-[#4D5559]"
        >
          Confirmação da senha<span className="text-[#805F11]"> *</span>
        </label>
        <div className="relative">
          <Lock
            aria-hidden
            className={cn(
              "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2",
              visivel("confirmacao") ? "text-[#B42318]" : "auth-field-icon"
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
          <label className="flex cursor-pointer items-start gap-2.5 text-xs text-[#5C6367]">
            <input
              type="checkbox"
              checked={aceite}
              onChange={(evento) => setAceite(evento.target.checked)}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border border-[#B8B4A8] bg-white transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#A77D16] peer-checked:border-[#A77D16] peer-checked:bg-[#D4AF37]"
            >
              {aceite && <ShieldCheck className="h-3 w-3 text-[#17191A]" />}
            </span>
            <span>
              Li e concordo com os{" "}
              <Link
                href="/termos"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[#805F11] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A77D16]"
              >
                Termos de Uso
              </Link>{" "}
              e a{" "}
              <Link
                href="/privacidade"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[#805F11] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A77D16]"
              >
                Política de Privacidade
              </Link>
              .
            </span>
          </label>
        </div>
        {enviado && !aceite && (
          <p className="pl-6 text-[11px] text-[#B42318]">
            É preciso aceitar os Termos e a Política para prosseguir.
          </p>
        )}
      </motion.div>

      <motion.button
        variants={item}
        type="submit"
        disabled={salvando}
        whileHover={salvando || semMovimento ? undefined : { scale: 1.015 }}
        whileTap={salvando || semMovimento ? undefined : { scale: 0.985 }}
        className="auth-lustro flex w-full items-center justify-center gap-2 rounded-xl gold-sheen py-3 text-sm font-semibold text-[#17191A] shadow-[0_8px_24px_-12px_rgba(212,175,55,0.38)] transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-55"
      >
        {salvando ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ShieldCheck className="h-4 w-4" />
        )}
        {salvando ? "Criando sua conta..." : "Criar minha conta"}
      </motion.button>

      <motion.p variants={item} className="text-center text-xs text-[#5C6367] pt-1">
        Você entrará como gestor do escritório e poderá convidar sua equipe depois. Já tem conta?{" "}
        <Link
          href="/login"
          onClick={irParaLogin}
          className="font-medium text-[#805F11] underline-offset-4 hover:underline hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A77D16]"
        >
          Entrar
        </Link>
      </motion.p>
    </motion.form>
  );
}
