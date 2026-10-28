"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Loader2, Lock, LogIn, Mail } from "lucide-react";
import {
  BotaoOlho,
  Campo,
  campoBase,
  campoComErro,
  campoNormal,
  container,
  item,
} from "@/components/auth/campos";
import { signIn } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

interface LoginFormProps {
  /** Transiciona a lâmina para o lado de cadastro sem recarregar */
  aoTrocarParaCadastro?: () => void;
  avisoInicial?: string | null;
  ativo?: boolean;
}

export function LoginForm({
  aoTrocarParaCadastro,
  avisoInicial,
}: LoginFormProps) {
  const router = useRouter();
  const semMovimento = useReducedMotion();
  const camposRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    router.prefetch("/dashboard");
  }, [router]);

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [lembrarAcesso, setLembrarAcesso] = useState(false);
  const [erro, setErro] = useState<string | null>(avisoInicial ?? null);
  const [entrando, setEntrando] = useState(false);

  async function handleSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);

    setEntrando(true);

    let resultado: Awaited<ReturnType<typeof signIn>>;
    try {
      resultado = await signIn({
        email,
        password: senha,
        lembrarAcesso,
      });
    } catch {
      resultado = { error: "Falha de conexão com o servidor. Verifique sua internet e tente novamente." };
    }

    if (resultado.error) {
      setErro(resultado.error);
      setEntrando(false);

      if (!semMovimento && camposRef.current) {
        gsap.fromTo(
          camposRef.current,
          { x: -10 },
          { x: 0, duration: 0.7, ease: "elastic.out(1, 0.32)", clearProps: "transform" }
        );
      }
      return;
    }

    router.push("/dashboard");
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      variants={container}
      initial="initial"
      animate="animate"
      className="space-y-5"
      noValidate
    >
      <motion.div variants={item} className="space-y-1.5">
        <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-[#17191A]">
          Entrar
        </h1>
        <p className="text-sm text-[#5C6367]">
          Bem-vindo de volta. Continue de onde parou.
        </p>
      </motion.div>

      <div ref={camposRef} className="space-y-5">
        <AnimatePresence initial={false}>
          {erro && (
            <motion.p
              role="alert"
              initial={{ opacity: 0, y: -6, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -6, height: 0 }}
              className="overflow-hidden rounded-xl border border-[#FDA29B] bg-[#FEF3F2] px-3.5 py-2.5 text-sm text-[#B42318]"
            >
              {erro}
            </motion.p>
          )}
        </AnimatePresence>

        <Campo id="login-email" label="E-mail" icone={Mail}>
          <input
            id="login-email"
            name="email"
            type="email"
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
            placeholder="voce@escritorio.com"
            autoComplete="email"
            required
            aria-invalid={erro ? true : undefined}
            className={cn(campoBase, "pr-3", erro ? campoComErro : campoNormal)}
          />
        </Campo>

        <Campo id="login-senha" label="Senha" icone={Lock}>
          <input
            id="login-senha"
            name="password"
            type={verSenha ? "text" : "password"}
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)}
            placeholder="Sua senha"
            autoComplete="current-password"
            required
            aria-invalid={erro ? true : undefined}
            className={cn(campoBase, "pr-11", erro ? campoComErro : campoNormal)}
          />
          <BotaoOlho
            visivel={verSenha}
            onToggle={() => setVerSenha((atual) => !atual)}
            rotulo="senha"
          />
        </Campo>

        <label className="flex cursor-pointer items-start gap-2.5 text-xs text-[#5C6367]">
          <input
            type="checkbox"
            checked={lembrarAcesso}
            onChange={(evento) => setLembrarAcesso(evento.target.checked)}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border border-[#B8B4A8] bg-white transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#A77D16] peer-checked:border-[#A77D16] peer-checked:bg-[#D4AF37]"
          >
            {lembrarAcesso && <Check className="h-3 w-3 text-[#17191A]" strokeWidth={3} />}
          </span>
          <span>
            <strong className="font-medium text-[#17191A]">Lembrar acesso</strong>
            <br />
            Mantenha sua sessão ativa neste dispositivo.
          </span>
        </label>
      </div>

      <motion.div variants={item} className="flex justify-end">
        <Link
          href="/esqueci-senha"
          className="text-xs text-[#5C6367] underline-offset-4 transition-colors hover:text-[#805F11] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A77D16]"
        >
          Esqueci minha senha
        </Link>
      </motion.div>

      <motion.button
        variants={item}
        type="submit"
        disabled={entrando}
        whileHover={entrando || semMovimento ? undefined : { scale: 1.015 }}
        whileTap={entrando || semMovimento ? undefined : { scale: 0.985 }}
        className="auth-lustro flex w-full items-center justify-center gap-2 rounded-xl gold-sheen py-3 text-sm font-semibold text-[#17191A] shadow-[0_10px_30px_-14px_rgba(212,175,55,0.38)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-55"
      >
        <span className="relative z-[1] inline-flex items-center gap-2">
          {entrando ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          {entrando ? "Entrando..." : "Entrar"}
        </span>
      </motion.button>

      <motion.p variants={item} className="text-sm text-[#5C6367]">
        Ainda não tem conta?{" "}
        <Link
          href="/signup"
          onClick={(evento) => {
            if (!aoTrocarParaCadastro) return;
            evento.preventDefault();
            aoTrocarParaCadastro();
          }}
          className="group inline-flex items-center gap-1 font-medium text-[#805F11] underline-offset-4 transition-colors hover:underline hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A77D16]"
        >
          Criar conta
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </motion.p>
    </motion.form>
  );
}
