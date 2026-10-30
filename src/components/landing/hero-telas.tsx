"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import { Pause, Play } from "lucide-react";

const SEM_MOVIMENTO = "(prefers-reduced-motion: reduce)";
const DURACAO_ABA = 4.6;
const useEfeitoDeLayout = typeof window === "undefined" ? useEffect : useLayoutEffect;

// Telas ilustrativas: dados fictícios, só para mostrar a cara de cada módulo.
function Janela({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-[0.45em] border-b border-white/[0.07] px-[1em] py-[0.7em]">
        <span className="h-[0.55em] w-[0.55em] rounded-full bg-white/15" />
        <span className="h-[0.55em] w-[0.55em] rounded-full bg-white/15" />
        <span className="h-[0.55em] w-[0.55em] rounded-full bg-[#D4AF37]/70" />
        <span className="ml-[0.6em] text-[0.8em] font-medium text-neutral-400">{titulo}</span>
      </div>
      <div className="flex-1 overflow-hidden p-[1em]">{children}</div>
    </div>
  );
}

function Linha({ a, b, c, destaque }: { a: string; b: string; c: string; destaque?: boolean }) {
  return (
    <div className="flex items-center gap-[0.7em] rounded-[0.6em] bg-white/[0.035] px-[0.8em] py-[0.6em]">
      <span className={`h-[0.45em] w-[0.45em] shrink-0 rounded-full ${destaque ? "bg-[#D4AF37] shadow-[0_0_0.6em_rgba(212,175,55,0.9)]" : "bg-neutral-600"}`} />
      <span className="flex-1 truncate text-[0.85em] text-neutral-200">{a}</span>
      <span className="truncate text-[0.75em] text-neutral-500">{b}</span>
      <span className="rounded-full border border-white/10 px-[0.6em] py-[0.15em] text-[0.7em] text-neutral-300">{c}</span>
    </div>
  );
}

function TelaDashboard() {
  return (
    <Janela titulo="Dashboard">
      <div className="grid grid-cols-3 gap-[0.6em]">
        {[
          ["Processos ativos", "128"],
          ["Prazos na semana", "9"],
          ["A receber", "R$ 42 mil"],
        ].map(([rotulo, valor]) => (
          <div key={rotulo} className="rounded-[0.7em] border border-white/[0.06] bg-white/[0.03] p-[0.7em]">
            <p className="text-[0.7em] text-neutral-500">{rotulo}</p>
            <p className="mt-[0.2em] text-[1.35em] font-semibold tracking-tight text-white">{valor}</p>
          </div>
        ))}
      </div>
      <div className="mt-[0.8em] flex h-[7.5em] items-end gap-[0.45em] rounded-[0.7em] border border-white/[0.06] bg-white/[0.02] p-[0.8em]">
        {[38, 52, 44, 70, 58, 82, 66, 92, 74, 88].map((altura, i) => (
          <span
            key={i}
            style={{ height: `${altura}%` }}
            className={`flex-1 rounded-t-[0.3em] ${i === 7 ? "bg-gradient-to-t from-[#A77D16] to-[#E9CF7A]" : "bg-white/[0.09]"}`}
          />
        ))}
      </div>
    </Janela>
  );
}

function TelaProcessos() {
  return (
    <Janela titulo="Processos">
      <div className="mb-[0.7em] flex items-center gap-[0.5em] rounded-[0.6em] border border-white/[0.07] px-[0.8em] py-[0.5em] text-[0.75em] text-neutral-500">
        Buscar por número CNJ, cliente ou parte
      </div>
      <div className="space-y-[0.45em]">
        <Linha a="0001234-56.2024.8.26.0100" b="TJSP" c="Novo andamento" destaque />
        <Linha a="0809876-12.2023.5.02.0011" b="TRT2" c="Concluso" />
        <Linha a="5004321-98.2024.4.03.6100" b="TRF3" c="Audiência" destaque />
        <Linha a="0012345-67.2022.8.19.0001" b="TJRJ" c="Prazo" />
      </div>
    </Janela>
  );
}

function TelaClientes() {
  return (
    <Janela titulo="Clientes">
      <div className="space-y-[0.45em]">
        {[
          ["AR", "Ana Ribeiro", "PF", "3 processos"],
          ["CA", "Construtora Alfa", "PJ", "7 processos"],
          ["ML", "Marcos Lima", "PF", "1 processo"],
          ["BS", "Beatriz Souza", "PF", "2 processos"],
        ].map(([sigla, nome, tipo, total]) => (
          <div key={nome} className="flex items-center gap-[0.7em] rounded-[0.6em] bg-white/[0.035] px-[0.8em] py-[0.55em]">
            <span className="flex h-[2em] w-[2em] shrink-0 items-center justify-center rounded-full bg-[#D4AF37]/15 text-[0.75em] font-semibold text-[#E9CF7A]">
              {sigla}
            </span>
            <span className="flex-1 truncate text-[0.85em] text-neutral-200">{nome}</span>
            <span className="text-[0.7em] text-neutral-500">{total}</span>
            <span className="rounded-full border border-white/10 px-[0.6em] py-[0.15em] text-[0.7em] text-neutral-300">{tipo}</span>
          </div>
        ))}
      </div>
    </Janela>
  );
}

function TelaAgenda() {
  const dias = ["Seg", "Ter", "Qua", "Qui", "Sex"];
  const eventos: [number, number, number, string, boolean][] = [
    [0, 10, 26, "Reunião", false],
    [1, 40, 30, "Audiência", true],
    [2, 18, 24, "Prazo", true],
    [3, 55, 28, "Despacho", false],
    [4, 26, 30, "Audiência", true],
  ];
  return (
    <Janela titulo="Agenda da equipe">
      <div className="grid h-full grid-cols-5 gap-[0.45em]">
        {dias.map((dia, i) => (
          <div key={dia} className="relative rounded-[0.6em] border border-white/[0.06] bg-white/[0.02]">
            <p className="py-[0.5em] text-center text-[0.7em] text-neutral-500">{dia}</p>
            {eventos
              .filter(([coluna]) => coluna === i)
              .map(([, topo, altura, rotulo, ouro]) => (
                <span
                  key={rotulo}
                  style={{ top: `${topo}%`, height: `${altura}%` }}
                  className={`absolute inset-x-[0.3em] rounded-[0.45em] p-[0.4em] text-[0.65em] font-medium ${ouro ? "bg-[#D4AF37]/20 text-[#E9CF7A]" : "bg-white/[0.07] text-neutral-300"}`}
                >
                  {rotulo}
                </span>
              ))}
          </div>
        ))}
      </div>
    </Janela>
  );
}

function TelaFinanceiro() {
  return (
    <Janela titulo="Financeiro">
      <div className="grid grid-cols-2 gap-[0.6em]">
        <div className="rounded-[0.7em] border border-white/[0.06] bg-white/[0.03] p-[0.7em]">
          <p className="text-[0.7em] text-neutral-500">Recebido no mês</p>
          <p className="lp-dourado mt-[0.2em] text-[1.35em] font-semibold tracking-tight">R$ 28.400</p>
        </div>
        <div className="rounded-[0.7em] border border-white/[0.06] bg-white/[0.03] p-[0.7em]">
          <p className="text-[0.7em] text-neutral-500">A receber</p>
          <p className="mt-[0.2em] text-[1.35em] font-semibold tracking-tight text-white">R$ 13.900</p>
        </div>
      </div>
      <div className="mt-[0.7em] space-y-[0.45em]">
        <Linha a="Honorários — Ana Ribeiro" b="Parcela 3/10" c="Pago" destaque />
        <Linha a="Êxito — Construtora Alfa" b="Vence dia 15" c="Aberto" />
        <Linha a="Consulta — Marcos Lima" b="À vista" c="Pago" destaque />
      </div>
    </Janela>
  );
}

const TELAS = [
  {
    rotulo: "Dashboard",
    texto: "Os números do escritório e o que precisa de atenção hoje.",
    Tela: TelaDashboard,
    chips: [
      { texto: "+3 movimentações hoje", classe: "-left-[4%] top-[18%]" },
      { texto: "Prazo vence amanhã", classe: "-right-[3%] bottom-[22%]" },
    ],
  },
  {
    rotulo: "Processos",
    texto: "Andamentos sincronizados pelo DataJud e intimações do DJEN.",
    Tela: TelaProcessos,
    chips: [
      { texto: "DataJud sincronizado", classe: "-right-[4%] top-[14%]" },
      { texto: "Intimação DJEN recebida", classe: "-left-[5%] bottom-[18%]" },
    ],
  },
  {
    rotulo: "Clientes",
    texto: "Ficha, prontuário e documentos de cada cliente.",
    Tela: TelaClientes,
    chips: [
      { texto: "Documento anexado", classe: "-left-[4%] top-[24%]" },
      { texto: "Prontuário atualizado", classe: "-right-[4%] bottom-[16%]" },
    ],
  },
  {
    rotulo: "Agenda",
    texto: "Prazos e audiências com responsável, na visão da equipe.",
    Tela: TelaAgenda,
    chips: [
      { texto: "Audiência às 14h", classe: "-right-[4%] top-[20%]" },
      { texto: "Responsável: Dra. Paula", classe: "-left-[5%] bottom-[20%]" },
    ],
  },
  {
    rotulo: "Financeiro",
    texto: "Honorários, parcelas e lançamentos com resumo do mês.",
    Tela: TelaFinanceiro,
    chips: [
      { texto: "Parcela recebida", classe: "-left-[4%] top-[16%]" },
      { texto: "R$ 3.200 em honorários", classe: "-right-[4%] bottom-[24%]" },
    ],
  },
];

/** Pilha 3D das telas do sistema com abas numeradas e troca automática. */
export function HeroTelas() {
  const [ativo, setAtivo] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [emFoco, setEmFoco] = useState(false);
  const [visivel, setVisivel] = useState(true);
  const raizRef = useRef<HTMLDivElement>(null);
  const palcoRef = useRef<HTMLDivElement>(null);
  const paineisRef = useRef<(HTMLDivElement | null)[]>([]);
  const chipsRef = useRef<(HTMLDivElement | null)[]>([]);
  const barrasRef = useRef<(HTMLSpanElement | null)[]>([]);
  const anteriorRef = useRef<number | null>(null);
  const timerRef = useRef<gsap.core.Tween | null>(null);

  useEfeitoDeLayout(() => {
    const palco = palcoRef.current;
    if (palco) gsap.set(palco, { rotationX: 16, rotationY: -18, rotationZ: 3 });
  }, []);

  // Posiciona a pilha: a tela ativa na frente, as demais recuando como folhas.
  useEfeitoDeLayout(() => {
    const parado = window.matchMedia(SEM_MOVIMENTO).matches;
    const total = TELAS.length;
    const anterior = anteriorRef.current;
    anteriorRef.current = ativo;

    paineisRef.current.forEach((painel, i) => {
      if (!painel) return;
      const d = (i - ativo + total) % total;
      const alvo = { x: d * 14, y: d * -20, z: d * -70, rotationX: 0, opacity: d > 3 ? 0 : 1 - d * 0.22 };
      gsap.killTweensOf(painel);
      if (parado || anterior === null) {
        gsap.set(painel, alvo);
      } else if (i === anterior) {
        // A tela que sai se solta para cima e volta pelo fundo da pilha.
        gsap
          .timeline()
          .to(painel, { y: -70, z: 140, rotationX: -10, duration: 0.55, ease: "power3.in" })
          .to(painel, { opacity: 0, duration: 0.22, ease: "power2.in" }, 0)
          .set(painel, { ...alvo, y: alvo.y - 30, opacity: 0 })
          .to(painel, { y: alvo.y, opacity: alvo.opacity, duration: 0.7, ease: "expo.out" });
      } else {
        gsap.to(painel, { ...alvo, duration: 0.9, delay: 0.2, ease: "expo.out" });
      }
    });

    chipsRef.current.forEach((grupo, i) => {
      if (!grupo) return;
      const chips = grupo.children;
      gsap.killTweensOf(chips);
      if (i !== ativo) {
        gsap.to(chips, { opacity: 0, z: 0, duration: parado ? 0 : 0.3 });
      } else if (parado) {
        gsap.set(chips, { opacity: 1, z: 90, y: 0 });
      } else {
        gsap.fromTo(
          chips,
          { opacity: 0, z: 0, y: 12 },
          { opacity: 1, z: 90, y: 0, duration: 1, stagger: 0.14, delay: 0.45, ease: "expo.out" },
        );
      }
    });
  }, [ativo]);

  // Barra de progresso da aba ativa funciona como relógio da troca automática.
  useEffect(() => {
    barrasRef.current.forEach((barra) => barra && gsap.set(barra, { scaleX: 0 }));
    const barra = barrasRef.current[ativo];
    if (!barra || window.matchMedia(SEM_MOVIMENTO).matches) return;
    timerRef.current = gsap.to(barra, {
      scaleX: 1,
      duration: DURACAO_ABA,
      ease: "none",
      paused: true,
      onComplete: () => setAtivo((atual) => (atual + 1) % TELAS.length),
    });
    return () => {
      timerRef.current?.kill();
      timerRef.current = null;
    };
  }, [ativo]);

  useEffect(() => {
    const timer = timerRef.current;
    if (!timer) return;
    if (pausado || emFoco || !visivel) timer.pause();
    else timer.resume();
  }, [ativo, pausado, emFoco, visivel]);

  useEffect(() => {
    const raiz = raizRef.current;
    if (!raiz) return;
    const observador = new IntersectionObserver((entradas) => setVisivel(entradas[0]?.isIntersecting ?? false));
    observador.observe(raiz);
    const aoMudarAba = () => setVisivel(!document.hidden);
    document.addEventListener("visibilitychange", aoMudarAba);
    return () => {
      observador.disconnect();
      document.removeEventListener("visibilitychange", aoMudarAba);
    };
  }, []);

  // Inclinação leve seguindo o cursor.
  useEffect(() => {
    const raiz = raizRef.current;
    const palco = palcoRef.current;
    if (!raiz || !palco) return;
    if (window.matchMedia(SEM_MOVIMENTO).matches || !window.matchMedia("(hover: hover)").matches) return;
    const giroY = gsap.quickTo(palco, "rotationY", { duration: 1.2, ease: "power3.out" });
    const giroX = gsap.quickTo(palco, "rotationX", { duration: 1.2, ease: "power3.out" });
    const mover = (evento: PointerEvent) => {
      const caixa = raiz.getBoundingClientRect();
      giroY(-18 + ((evento.clientX - caixa.left) / caixa.width - 0.5) * 10);
      giroX(16 - ((evento.clientY - caixa.top) / caixa.height - 0.5) * 8);
    };
    const sair = () => {
      giroY(-18);
      giroX(16);
    };
    raiz.addEventListener("pointermove", mover, { passive: true });
    raiz.addEventListener("pointerleave", sair);
    return () => {
      raiz.removeEventListener("pointermove", mover);
      raiz.removeEventListener("pointerleave", sair);
      gsap.killTweensOf(palco);
    };
  }, []);

  const escolher = (indice: number) => {
    setPausado(true);
    setAtivo(indice);
  };

  const atual = TELAS[ativo];
  if (!atual) return null;

  return (
    <div
      ref={raizRef}
      className="relative mx-auto w-full max-w-[600px]"
      onFocus={() => setEmFoco(true)}
      onBlur={(evento) => !evento.currentTarget.contains(evento.relatedTarget) && setEmFoco(false)}
    >
      <div className="lp-cantos relative px-[6%] pb-[8%] pt-[14%] [perspective:1600px]" aria-hidden="true">
        <div className="pointer-events-none absolute inset-x-[10%] bottom-[2%] h-[40%] rounded-full bg-[radial-gradient(closest-side,rgba(212,175,55,0.28),transparent)] blur-2xl" />
        <div
          ref={palcoRef}
          className="relative aspect-[16/11] [container-type:inline-size] [transform-style:preserve-3d] [transform:rotateX(16deg)_rotateY(-18deg)_rotateZ(3deg)]"
        >
          {TELAS.map(({ rotulo, Tela }, i) => (
            <div
              key={rotulo}
              ref={(el) => {
                paineisRef.current[i] = el;
              }}
              className="lp-tela absolute inset-0 text-[2.3cqw]"
            >
              <Tela />
            </div>
          ))}
          {TELAS.map(({ rotulo, chips }, i) => (
            <div
              key={rotulo}
              ref={(el) => {
                chipsRef.current[i] = el;
              }}
              className="pointer-events-none absolute inset-0 text-[2.3cqw] [transform-style:preserve-3d]"
            >
              {chips.map((chip) => (
                <span key={chip.texto} className={`lp-chip absolute opacity-0 ${chip.classe}`}>
                  <span className="lp-ponto" />
                  {chip.texto}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-start gap-3">
        <div role="group" aria-label="Telas do sistema" className="lp-sem-barra -mx-1 flex flex-1 gap-0.5 overflow-x-auto px-1">
          {TELAS.map(({ rotulo }, i) => (
            <button
              key={rotulo}
              type="button"
              aria-pressed={i === ativo}
              onClick={() => escolher(i)}
              className={`relative shrink-0 overflow-hidden rounded-full px-2.5 py-1.5 text-[12.5px] font-medium transition-colors ${i === ativo ? "bg-white/[0.06] text-white" : "text-neutral-500 hover:text-neutral-200"}`}
            >
              <span className={`mr-1 text-[10.5px] tabular-nums ${i === ativo ? "text-[#E9CF7A]" : "text-neutral-600"}`}>
                0{i + 1}
              </span>
              {rotulo}
              <span
                ref={(el) => {
                  barrasRef.current[i] = el;
                }}
                aria-hidden="true"
                className="absolute inset-x-2.5 bottom-0.5 h-px origin-left scale-x-0 bg-[#D4AF37]"
              />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setPausado((valor) => !valor)}
          aria-label={pausado ? "Retomar troca automática das telas" : "Pausar troca automática das telas"}
          className="lp-link mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10"
        >
          {pausado ? <Play className="h-3.5 w-3.5" aria-hidden="true" /> : <Pause className="h-3.5 w-3.5" aria-hidden="true" />}
        </button>
      </div>
      <p className="mt-2 min-h-[2.5rem] px-3 text-sm leading-snug text-neutral-400">
        <span className="font-medium text-neutral-200">{atual.rotulo}.</span> {atual.texto}{" "}
        <span className="text-neutral-600">Dados ilustrativos.</span>
      </p>
    </div>
  );
}
