"use client";

import { useEffect, useRef } from "react";

const SEM_MOVIMENTO = "(prefers-reduced-motion: reduce)";
const QUADRO_MS = 1000 / 30;

// Cada faixa é um feixe de fios que ondula e torce como seda; valores em fração da tela.
const FAIXAS = [
  { base: 0.86, subida: 0.34, amp: 0.07, freq: 1.7, vel: 0.32, fase: 0, fios: 26, abertura: 0.11, cor: "167,125,22" },
  { base: 0.98, subida: 0.22, amp: 0.09, freq: 1.2, vel: -0.22, fase: 2.1, fios: 20, abertura: 0.08, cor: "212,175,55" },
];

/** Fios de seda dourada em canvas. Pausa fora da viewport e com a aba oculta; parado com movimento reduzido. */
function SedaCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const parado = window.matchMedia(SEM_MOVIMENTO).matches;
    let largura = 0;
    let altura = 0;
    let passos = 0;
    let tempo = 0;
    let ultimo = 0;
    let quadro = 0;
    let visivel = false;

    const desenhar = () => {
      const w = largura;
      const h = altura;
      if (!w || !h) return;
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;
      for (const faixa of FAIXAS) {
        for (let k = 0; k < faixa.fios; k++) {
          const u = k / (faixa.fios - 1) - 0.5;
          ctx.beginPath();
          for (let i = 0; i <= passos; i++) {
            const x = i / passos;
            const onda = Math.sin(x * faixa.freq * Math.PI + tempo * faixa.vel + faixa.fase);
            const torcao = Math.sin(x * Math.PI * 1.4 + tempo * 0.35 + faixa.fase);
            const y = faixa.base - x * faixa.subida + faixa.amp * onda + u * faixa.abertura * torcao;
            if (i === 0) ctx.moveTo(x * w, y * h);
            else ctx.lineTo(x * w, y * h);
          }
          ctx.strokeStyle = `rgba(${faixa.cor},${0.05 + 0.3 * (1 - Math.abs(u) * 2)})`;
          ctx.stroke();
        }
      }
    };

    const laco = (agora: number) => {
      quadro = requestAnimationFrame(laco);
      if (agora - ultimo < QUADRO_MS) return;
      tempo += Math.min(agora - ultimo, 100) * 0.001;
      ultimo = agora;
      desenhar();
    };

    const iniciar = () => {
      if (parado || quadro || !visivel || document.hidden) return;
      ultimo = performance.now();
      quadro = requestAnimationFrame(laco);
    };

    const parar = () => {
      cancelAnimationFrame(quadro);
      quadro = 0;
    };

    const redimensionar = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      largura = canvas.clientWidth;
      altura = canvas.clientHeight;
      canvas.width = Math.round(largura * dpr);
      canvas.height = Math.round(altura * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      passos = largura < 768 ? 48 : 96;
      desenhar();
    };

    const aoMudarAba = () => (document.hidden ? parar() : iniciar());
    const observadorTamanho = new ResizeObserver(redimensionar);
    observadorTamanho.observe(canvas);
    const observadorVisao = new IntersectionObserver((entradas) => {
      visivel = entradas[0]?.isIntersecting ?? false;
      if (visivel) iniciar();
      else parar();
    });
    observadorVisao.observe(canvas);
    document.addEventListener("visibilitychange", aoMudarAba);

    return () => {
      parar();
      observadorTamanho.disconnect();
      observadorVisao.disconnect();
      document.removeEventListener("visibilitychange", aoMudarAba);
    };
  }, []);

  return <canvas ref={ref} className="lp-seda absolute inset-0 h-full w-full" />;
}

const COLUNAS = [110, 194, 278, 362, 446, 530];

/** Pórtico de tribunal em traço fino: frontão, entablamento, colunas caneladas e degraus. */
function Portico() {
  return (
    <svg className="lp-portico" viewBox="0 0 640 380" fill="none">
      <polygon points="60,110 320,30 580,110" pathLength={1} />
      <polygon points="104,102 320,44 536,102" pathLength={1} />
      <rect x="52" y="110" width="536" height="26" pathLength={1} />
      <line x1="52" y1="123" x2="588" y2="123" pathLength={1} />
      {COLUNAS.map((cx) => (
        <g key={cx}>
          <rect x={cx - 24} y="136" width="48" height="10" pathLength={1} />
          <rect x={cx - 17} y="146" width="34" height="168" pathLength={1} />
          {[-8, 0, 8].map((dx) => (
            <line key={dx} x1={cx + dx} y1="152" x2={cx + dx} y2="308" pathLength={1} />
          ))}
          <rect x={cx - 24} y="314" width="48" height="10" pathLength={1} />
        </g>
      ))}
      <rect x="36" y="324" width="568" height="12" pathLength={1} />
      <rect x="20" y="336" width="600" height="12" pathLength={1} />
      <rect x="4" y="348" width="632" height="12" pathLength={1} />
    </svg>
  );
}

/** Fundo do hero: luzes douradas à deriva, pórtico de tribunal e fios de seda. */
export function HeroFundo() {
  return (
    <div className="lp-fundo absolute inset-0">
      <span className="lp-luz lp-luz-1" />
      <span className="lp-luz lp-luz-2" />
      <span className="lp-luz lp-luz-3" />
      <Portico />
      <SedaCanvas />
    </div>
  );
}
