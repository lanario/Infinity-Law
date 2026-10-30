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
      <div className="flex items-center gap-[0.45em] border-b border-black/[0.07] px-[1em] py-[0.7em]">
        <span className="h-[0.55em] w-[0.55em] rounded-full bg-black/15" />
        <span className="h-[0.55em] w-[0.55em] rounded-full bg-black/15" />
        <span className="h-[0.55em] w-[0.55em] rounded-full bg-[#D4AF37]/70" />
        <span className="ml-[0.6em] text-[0.8em] font-medium text-neutral-600">{titulo}</span>
      </div>
      <div className="flex-1 overflow-hidden p-[1em]">{children}</div>
    </div>
  );
}

function Linha({ a, b, c, destaque }: { a: string; b: string; c: string; destaque?: boolean }) {
  return (
    <div className="flex items-center gap-[0.7em] rounded-[0.6em] bg-black/[0.035] px-[0.8em] py-[0.6em]">
      <span className={`h-[0.45em] w-[0.45em] shrink-0 rounded-full ${destaque ? "bg-[#D4AF37] shadow-[0_0_0.6em_rgba(212,175,55,0.9)]" : "bg-neutral-300"}`} />
      <span className="flex-1 truncate text-[0.85em] text-neutral-800">{a}</span>
      <span className="truncate text-[0.75em] text-[#66666b]">{b}</span>
      <span className="rounded-full border border-black/10 px-[0.6em] py-[0.15em] text-[0.7em] text-neutral-700">{c}</span>
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
          <div key={rotulo} className="rounded-[0.7em] border border-black/[0.06] bg-black/[0.03] p-[0.7em]">
            <p className="text-[0.7em] text-[#66666b]">{rotulo}</p>
            <p className="mt-[0.2em] text-[1.35em] font-semibold tracking-tight text-[#17191a]">{valor}</p>
          </div>
        ))}
      </div>
      <div className="mt-[0.8em] flex h-[7.5em] items-end gap-[0.45em] rounded-[0.7em] border border-black/[0.06] bg-black/[0.02] p-[0.8em]">
        {[38, 52, 44, 70, 58, 82, 66, 92, 74, 88].map((altura, i) => (
          <span
            key={i}
            style={{ height: `${altura}%` }}
            className={`flex-1 rounded-t-[0.3em] ${i === 7 ? "bg-gradient-to-t from-[#A77D16] to-[#E9CF7A]" : "bg-black/[0.09]"}`}
          />
        ))}
      </div>
    </Janela>
  );
}

function TelaProcessos() {
  return (
    <Janela titulo="Processos">
      <div className="mb-[0.7em] flex items-center gap-[0.5em] rounded-[0.6em] border border-black/[0.07] px-[0.8em] py-[0.5em] text-[0.75em] text-[#66666b]">
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
          <div key={nome} className="flex items-center gap-[0.7em] rounded-[0.6em] bg-black/[0.035] px-[0.8em] py-[0.55em]">
            <span className="flex h-[2em] w-[2em] shrink-0 items-center justify-center rounded-full bg-[#D4AF37]/15 text-[0.75em] font-semibold text-[#805F11]">
              {sigla}
            </span>
            <span className="flex-1 truncate text-[0.85em] text-neutral-800">{nome}</span>
            <span className="text-[0.7em] text-[#66666b]">{total}</span>
            <span className="rounded-full border border-black/10 px-[0.6em] py-[0.15em] text-[0.7em] text-neutral-700">{tipo}</span>
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
          <div key={dia} className="relative rounded-[0.6em] border border-black/[0.06] bg-black/[0.02]">
            <p className="py-[0.5em] text-center text-[0.7em] text-[#66666b]">{dia}</p>
            {eventos
              .filter(([coluna]) => coluna === i)
              .map(([, topo, altura, rotulo, ouro]) => (
                <span
                  key={rotulo}
                  style={{ top: `${topo}%`, height: `${altura}%` }}
                  className={`absolute inset-x-[0.3em] rounded-[0.45em] p-[0.4em] text-[0.65em] font-medium ${ouro ? "bg-[#D4AF37]/20 text-[#805F11]" : "bg-black/[0.07] text-neutral-700"}`}
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
        <div className="rounded-[0.7em] border border-black/[0.06] bg-black/[0.03] p-[0.7em]">
          <p className="text-[0.7em] text-[#66666b]">Recebido no mês</p>
          <p className="lp-dourado mt-[0.2em] text-[1.35em] font-semibold tracking-tight">R$ 28.400</p>
        </div>
        <div className="rounded-[0.7em] border border-black/[0.06] bg-black/[0.03] p-[0.7em]">
          <p className="text-[0.7em] text-[#66666b]">A receber</p>
          <p className="mt-[0.2em] text-[1.35em] font-semibold tracking-tight text-[#17191a]">R$ 13.900</p>
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
  const [visivel, setVisivel] = useState(false);
  const [movimentoReduzido, setMovimentoReduzido] = useState(false);
  const raizRef = useRef<HTMLDivElement>(null);
  const palcoRef = useRef<HTMLDivElement>(null);
  const paineisRef = useRef<(HTMLDivElement | null)[]>([]);
  const chipsRef = useRef<(HTMLDivElement | null)[]>([]);
  const barrasRef = useRef<(HTMLSpanElement | null)[]>([]);
  const anteriorRef = useRef<number | null>(null);
  const timerRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    const preferencia = window.matchMedia(SEM_MOVIMENTO);
    const atualizar = () => setMovimentoReduzido(preferencia.matches);
    atualizar();
    preferencia.addEventListener("change", atualizar);
    return () => preferencia.removeEventListener("change", atualizar);
  }, []);

  useEfeitoDeLayout(() => {
    const palco = palcoRef.current;
    if (palco) gsap.set(palco, { rotationX: 16, rotationY: -18, rotationZ: 3 });
  }, []);

  // Preserva a posição atual entre trocas; reverter o contexto aqui fazia a pilha saltar.
  useEfeitoDeLayout(() => {
    const parado = window.matchMedia(SEM_MOVIMENTO).matches;
    const anterior = anteriorRef.current;
    anteriorRef.current = ativo;
    const transicao = gsap.timeline();

    paineisRef.current.forEach((painel, i) => {
      if (!painel) return;
      const distancia = (i - ativo + TELAS.length) % TELAS.length;
      const alvo = { x: distancia * 14, y: distancia * -20, z: distancia * -70, rotationX: 0, opacity: distancia > 3 ? 0 : 1 - distancia * 0.22 };
      if (parado || anterior === null || anterior === ativo) {
        transicao.set(painel, alvo, 0);
      } else if (i === anterior) {
        transicao
          .to(painel, { y: -55, z: 100, rotationX: -6, duration: 0.45, ease: "power2.inOut" }, 0)
          .to(painel, { opacity: 0, duration: 0.25 }, 0)
          .set(painel, { ...alvo, opacity: 0 }, 0.45)
          .to(painel, { opacity: alvo.opacity, duration: 0.55, ease: "power2.out" }, 0.45);
      } else {
        transicao.to(painel, { ...alvo, duration: 0.85, ease: "power3.inOut" }, 0.1);
      }
    });

    chipsRef.current.forEach((grupo, i) => {
      if (!grupo) return;
      if (i !== ativo) {
        transicao.to(grupo.children, { opacity: 0, z: 0, duration: parado ? 0 : 0.2 }, 0);
      } else if (parado) {
        transicao.set(grupo.children, { opacity: 1, z: 90, y: 0 }, 0);
      } else {
        transicao.fromTo(grupo.children, { opacity: 0, z: 0, y: 10 }, {
          opacity: 1, z: 90, y: 0, duration: 0.7, stagger: 0.1, ease: "power3.out",
        }, 0.45);
      }
    });
    return () => { transicao.kill(); };
  }, [ativo, movimentoReduzido]);

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
  }, [ativo, movimentoReduzido]);

  useEffect(() => {
    const timer = timerRef.current;
    if (!timer) return;
    if (pausado || emFoco || !visivel) timer.pause();
    else timer.resume();
  }, [ativo, pausado, emFoco, visivel, movimentoReduzido]);

  useEffect(() => {
    const raiz = raizRef.current;
    if (!raiz) return;
    let intersectando = false;
    const aoMudarAba = () => setVisivel(intersectando && !document.hidden);
    const observador = new IntersectionObserver((entradas) => {
      intersectando = entradas[0]?.isIntersecting ?? false;
      aoMudarAba();
    });
    observador.observe(raiz);
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
    let quadro = 0;
    let ultimoEvento: PointerEvent | null = null;
    const mover = (evento: PointerEvent) => {
      ultimoEvento = evento;
      if (quadro) return;
      quadro = requestAnimationFrame(() => {
        quadro = 0;
        const eventoAtual = ultimoEvento;
        ultimoEvento = null;
        if (!eventoAtual) return;
        const caixa = raiz.getBoundingClientRect();
        giroY(-18 + ((eventoAtual.clientX - caixa.left) / caixa.width - 0.5) * 10);
        giroX(16 - ((eventoAtual.clientY - caixa.top) / caixa.height - 0.5) * 8);
      });
    };
    const sair = () => {
      ultimoEvento = null;
      if (quadro) cancelAnimationFrame(quadro);
      quadro = 0;
      giroY(-18);
      giroX(16);
    };
    raiz.addEventListener("pointermove", mover, { passive: true });
    raiz.addEventListener("pointerleave", sair);
    return () => {
      if (quadro) cancelAnimationFrame(quadro);
      raiz.removeEventListener("pointermove", mover);
      raiz.removeEventListener("pointerleave", sair);
      gsap.killTweensOf(palco);
      gsap.set(palco, { rotationX: 16, rotationY: -18, rotationZ: 3 });
    };
  }, [movimentoReduzido]);

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
          className="relative aspect-[16/10] [container-type:inline-size] [transform-style:preserve-3d] [transform:rotateX(16deg)_rotateY(-18deg)_rotateZ(3deg)]"
        >
          {TELAS.map(({ rotulo, Tela }, i) => (
            <div
              key={rotulo}
              ref={(el) => {
                paineisRef.current[i] = el;
              }}
              className="lp-tela absolute inset-0 text-[2.65cqw]"
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
              className="pointer-events-none absolute inset-0 text-[2.65cqw] [transform-style:preserve-3d]"
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

      <div className="lp-telas-controles">
        <div role="group" aria-label="Telas do sistema" className="lp-telas-abas">
          {TELAS.map(({ rotulo }, i) => (
            <button
              key={rotulo}
              type="button"
              aria-pressed={i === ativo}
              onClick={() => escolher(i)}
              className={`relative shrink-0 overflow-hidden rounded-full px-2.5 py-1.5 text-[12.5px] font-medium transition-colors ${i === ativo ? "bg-[#D4AF37]/15 text-[#17191a] ring-1 ring-inset ring-[#D4AF37]/60" : "text-[#66666b] hover:bg-[#D4AF37]/[0.08] hover:text-neutral-800"}`}
            >
              <span className="mr-1 text-[10.5px] font-semibold tabular-nums text-[#805F11]">
                0{i + 1}
              </span>
              {rotulo}
              <span
                ref={(el) => {
                  barrasRef.current[i] = el;
                }}
                aria-hidden="true"
                className="absolute inset-x-3 bottom-[3px] h-[2px] origin-left scale-x-0 rounded-full bg-[#D4AF37]"
              />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setPausado((valor) => !valor)}
          disabled={movimentoReduzido}
          aria-label={pausado ? "Retomar troca automática das telas" : "Pausar troca automática das telas"}
          className="lp-telas-pausa lp-link rounded-full border border-[#D4AF37]/60 bg-[#D4AF37]/10 text-[#805F11] hover:bg-[#D4AF37]/20 disabled:hidden"
        >
          {pausado ? <Play className="h-3.5 w-3.5" aria-hidden="true" /> : <Pause className="h-3.5 w-3.5" aria-hidden="true" />}
        </button>
      </div>
      <p className="lp-telas-legenda mt-2 px-2 text-sm leading-relaxed text-neutral-600">
        <span className="font-medium text-neutral-800">{atual.rotulo}.</span> {atual.texto}{" "}
        <span className="text-[#66666b]">Dados ilustrativos.</span>
      </p>
    </div>
  );
}
