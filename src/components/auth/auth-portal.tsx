"use client";

/**
 * /login e /signup na mesma peça interativa unificada.
 *
 * Entrar e criar conta são os dois lados de um cartão cortado por uma lâmina
 * inclinada a ~9 graus. A troca de lado aciona uma transição fluida orquestrada
 * por GSAP, sincronizando a URL via history.replaceState sem recarregar a página.
 *
 * Cores, sombras e tipografia da identidade clara com dourado do Infinity Law.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ArrowLeft, Check } from "lucide-react";
import { CadastroForm } from "@/components/auth/cadastro-form";
import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/ui/logo";

export type ModoAuth = "entrar" | "cadastrar";

/** Inclinação padrão da lâmina. Espelha `--auth-rake` no globals.css. */
const RAKE = 9;
/** Teto da folga da diagonal para evitar espiral de altura */
const FOLGA_MAXIMA = 108;
/** Fração do cartão ocupada pela coluna do formulário */
const LADO = 0.58;
/** Padding vertical interno da coluna em px */
const RESPIRO = 40;
/** Piso da altura do cartão */
const ALTURA_MINIMA = 560;
/** Breakpoint do desktop */
const DESKTOP = "(min-width: 64rem)";
const SEM_MOVIMENTO = "(prefers-reduced-motion: reduce)";

const TAN = Math.tan((RAKE * Math.PI) / 180);

function corte(altura: number) {
  const pad = Math.min(altura * TAN, FOLGA_MAXIMA);
  return { pad, rake: (Math.atan(pad / altura) * 180) / Math.PI };
}

const useEfeitoDeLayout = typeof window === "undefined" ? useEffect : useLayoutEffect;

const VANTAGENS = [
  "Processos e prazos em tempo real",
  "Agenda, audiências e equipe integradas",
  "Relatórios e financeiro em um só lugar",
];

const MARCA: Record<ModoAuth, { etiqueta: string; titulo: ReactNode; texto: string }> = {
  entrar: {
    etiqueta: "GESTÃO JURÍDICA",
    titulo: (
      <>
        Tudo continua
        <br />
        <em className="auth-serifada">onde você parou.</em>
      </>
    ),
    texto:
      "Processos do mês, prazos a vencer e a agenda da semana esperando exatamente como você deixou.",
  },
  cadastrar: {
    etiqueta: "COMECE AGORA",
    titulo: (
      <>
        Comece pelo
        <br />
        <em className="auth-serifada">primeiro processo.</em>
      </>
    ),
    texto:
      "Uma conta para o seu escritório, seus clientes e sua equipe jurídica. Leva um minuto para criar.",
  },
};

interface AuthPortalProps {
  inicial: ModoAuth;
  avisoInicial?: string | null;
}

export function AuthPortal({ inicial, avisoInicial }: AuthPortalProps) {
  const [modo, setModo] = useState<ModoAuth>(inicial);

  const portalRef = useRef<HTMLDivElement>(null);
  const marcaRef = useRef<HTMLDivElement>(null);
  const brilhoRef = useRef<HTMLDivElement>(null);
  const entrarRef = useRef<HTMLDivElement>(null);
  const cadastrarRef = useRef<HTMLDivElement>(null);

  const modoRef = useRef(modo);
  const travadoRef = useRef(false);
  const larguraRef = useRef(0);
  const estadoRef = useRef({ sweep: 0, cover: 0, altura: ALTURA_MINIMA });

  const caixaDoModo = useCallback(
    (destino: ModoAuth) => (destino === "entrar" ? entrarRef.current : cadastrarRef.current),
    []
  );

  const geometria = useCallback(
    (destino: ModoAuth) => {
      const largura = larguraRef.current;
      const altura = Math.max(
        ALTURA_MINIMA,
        (caixaDoModo(destino)?.offsetHeight ?? 0) + RESPIRO * 2
      );
      const { pad } = corte(altura);
      const cover = largura * (1 - LADO) + pad;
      // "entrar" deixa a lâmina à direita; "cadastrar", à esquerda
      const sweep = destino === "entrar" ? largura - cover + pad / 2 : -pad / 2;
      return { largura, altura, pad, cover, sweep };
    },
    [caixaDoModo]
  );

  const pintar = useCallback(() => {
    const portal = portalRef.current;
    if (!portal) return;
    const { sweep, cover, altura } = estadoRef.current;
    const { pad, rake } = corte(altura);
    portal.style.setProperty("--auth-w", `${larguraRef.current}px`);
    portal.style.setProperty("--auth-h", `${altura}px`);
    portal.style.setProperty("--auth-rake", `${rake}deg`);
    portal.style.setProperty("--auth-pad", `${pad}px`);
    portal.style.setProperty("--auth-cover", `${cover}px`);
    portal.style.setProperty("--auth-sweep", `${sweep}px`);
  }, []);

  const sincronizar = useCallback(() => {
    const portal = portalRef.current;
    if (!portal) return;
    larguraRef.current = portal.clientWidth;
    const { sweep, cover, altura } = geometria(modoRef.current);
    estadoRef.current = { sweep, cover, altura };
    pintar();
  }, [geometria, pintar]);

  useEfeitoDeLayout(() => {
    const portal = portalRef.current;
    if (!portal) return;

    sincronizar();

    const observador = new ResizeObserver(() => {
      if (travadoRef.current) return;

      larguraRef.current = portal.clientWidth;
      const { sweep, cover, altura } = geometria(modoRef.current);
      estadoRef.current.sweep = sweep;
      estadoRef.current.cover = cover;

      const degrau = Math.abs(altura - estadoRef.current.altura);
      if (degrau > 4 && !window.matchMedia(SEM_MOVIMENTO).matches) {
        gsap.to(estadoRef.current, {
          altura,
          duration: 0.35,
          ease: "power2.out",
          overwrite: "auto",
          onUpdate: pintar,
        });
      } else {
        estadoRef.current.altura = altura;
      }
      pintar();
    });

    for (const caixa of [entrarRef.current, cadastrarRef.current]) {
      if (caixa) observador.observe(caixa);
    }

    const contexto = gsap.context(() => {
      if (window.matchMedia(SEM_MOVIMENTO).matches) return;

      gsap.from(portal, { opacity: 0, y: 12, duration: 0.25, ease: "power3.out" });
      if (!window.matchMedia(DESKTOP).matches) return;

      const { sweep, cover, largura, pad } = geometria(modoRef.current);
      gsap.fromTo(
        estadoRef.current,
        { sweep: modoRef.current === "entrar" ? largura + pad : -cover - pad },
        { sweep, duration: 0.6, ease: "power4.out", onUpdate: pintar }
      );
      gsap.from(marcaRef.current, {
        opacity: 0,
        x: modoRef.current === "entrar" ? 34 : -34,
        duration: 0.3,
        ease: "power3.out",
      });
    }, portal);

    const estado = estadoRef.current;
    return () => {
      observador.disconnect();
      contexto.revert();
      gsap.killTweensOf(estado);
    };
  }, [geometria, pintar, sincronizar]);

  // Efeito de iluminação ambiental sutil acompanhando o ponteiro do mouse
  useEffect(() => {
    const brilho = brilhoRef.current;
    if (!brilho) return;
    if (window.matchMedia(SEM_MOVIMENTO).matches || window.matchMedia("(hover: none)").matches) {
      return;
    }

    const paraX = gsap.quickTo(brilho, "x", { duration: 1.1, ease: "power3.out" });
    const paraY = gsap.quickTo(brilho, "y", { duration: 1.1, ease: "power3.out" });
    const mover = (evento: PointerEvent) => {
      paraX((evento.clientX / window.innerWidth - 0.5) * 70);
      paraY((evento.clientY / window.innerHeight - 0.5) * 46);
    };

    window.addEventListener("pointermove", mover, { passive: true });
    return () => {
      window.removeEventListener("pointermove", mover);
      gsap.killTweensOf(brilho);
    };
  }, []);

  const trocar = useCallback(
    (destino: ModoAuth) => {
      if (destino === modoRef.current || travadoRef.current) return;

      const portal = portalRef.current;
      const desktop = window.matchMedia(DESKTOP).matches;
      const parado = window.matchMedia(SEM_MOVIMENTO).matches;

      const assumir = () => {
        modoRef.current = destino;
        setModo(destino);
        window.history.replaceState(null, "", destino === "entrar" ? "/login" : "/signup");
      };

      if (!portal || !desktop || parado) {
        assumir();
        requestAnimationFrame(() => {
          sincronizar();
          const caixa = caixaDoModo(destino);
          if (!caixa || parado) return;
          gsap.fromTo(
            caixa,
            { opacity: 0, y: 14 },
            { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", clearProps: "transform" }
          );
        });
        return;
      }

      travadoRef.current = true;

      const alvo = geometria(destino);
      const cheio = alvo.largura + alvo.pad * 2;
      const sentido = destino === "entrar" ? 1 : -1;

      gsap
        .timeline({
          onComplete: () => {
            travadoRef.current = false;
            sincronizar();
          },
        })
        .to(
          estadoRef.current,
          {
            sweep: -alvo.pad / 2,
            cover: cheio,
            duration: 0.38,
            ease: "power2.in",
            onUpdate: pintar,
          },
          0
        )
        .to(marcaRef.current, { opacity: 0, duration: 0.22, ease: "power1.in" }, 0.06)
        .to(
          estadoRef.current,
          { altura: alvo.altura, duration: 1.0, ease: "power2.inOut", onUpdate: pintar },
          0
        )
        .add(assumir, 0.38)
        .to(
          estadoRef.current,
          {
            sweep: alvo.sweep,
            cover: alvo.cover,
            duration: 0.66,
            ease: "power4.out",
            onUpdate: pintar,
          },
          0.38
        )
        .fromTo(
          caixaDoModo(destino),
          { opacity: 0, x: 24 * sentido },
          { opacity: 1, x: 0, duration: 0.62, ease: "power3.out", clearProps: "transform" },
          0.46
        )
        .fromTo(
          marcaRef.current,
          { opacity: 0, x: 26 * sentido },
          { opacity: 1, x: 0, duration: 0.6, ease: "power3.out" },
          0.5
        );
    },
    [caixaDoModo, geometria, pintar, sincronizar]
  );

  const marca = MARCA[modo];

  return (
    <div className="auth-palco">
      <div aria-hidden className="auth-ambiente">
        <div ref={brilhoRef} className="auth-brilho" />
        <div className="auth-malha" />
      </div>

      <Link
        href="/"
        className="absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-[#E0DBCF] bg-white/90 px-3.5 py-2 text-xs text-[#5C6367] backdrop-blur transition-all hover:border-[#A77D16]/60 hover:text-[#17191A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A77D16] sm:left-7 sm:top-7"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar ao início
      </Link>

      <div ref={portalRef} className="auth-portal" data-modo={modo}>
        {/* Faixa de marca do mobile */}
        <div className="auth-marca-topo">
          <Logo size="sm" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#805F11]">
            {marca.etiqueta}
          </span>
        </div>

        {/* Lâmina diagonal animada (Desktop) */}
        <div className="auth-lamina">
          <span className="auth-halo" data-borda="inicio" />
          <span className="auth-halo" data-borda="fim" />
          <span className="auth-fio" data-borda="inicio" />
          <span className="auth-fio" data-borda="fim" />

          <div className="auth-lamina-conteudo">
            <div ref={marcaRef} className="auth-marca">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <Logo size="md" className="whitespace-nowrap" />
                <span className="whitespace-nowrap rounded-full border border-[#805F11]/30 bg-[#D4AF37]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#805F11]">
                  {marca.etiqueta}
                </span>
              </div>

              <div className="space-y-4">
                <h2 className="text-[clamp(1.75rem,2.4vw,2.1rem)] font-semibold leading-[1.12] tracking-tight text-[#17191A]">
                  {marca.titulo}
                </h2>
                <p className="max-w-[32ch] text-sm leading-relaxed text-[#5C6367]">
                  {marca.texto}
                </p>
              </div>

              <ul className="space-y-3">
                {VANTAGENS.map((vantagem) => (
                  <li
                    key={vantagem}
                    className="flex items-center gap-2.5 text-[13px] text-[#3F4548]"
                  >
                    <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[#D4AF37]/20 text-[#805F11]">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                    {vantagem}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Coluna interativa dos formulários */}
        <div className="auth-coluna">
          <div className="auth-troca">
            <div
              ref={entrarRef}
              className="auth-form"
              data-ativo={modo === "entrar"}
            >
              <LoginForm
                ativo={modo === "entrar"}
                avisoInicial={avisoInicial}
                aoTrocarParaCadastro={() => trocar("cadastrar")}
              />
            </div>

            <div
              ref={cadastrarRef}
              className="auth-form"
              data-ativo={modo === "cadastrar"}
            >
              <CadastroForm
                ativo={modo === "cadastrar"}
                aoTrocarParaLogin={() => trocar("entrar")}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
