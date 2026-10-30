"use client";

import { useEffect, useRef } from "react";

const SEM_MOVIMENTO = "(prefers-reduced-motion: reduce)";
const FUNDO = "#f7f6f1";
const Z_PERTO = 1.15;
const PROFUNDIDADE = 9;
const LARGURA_MUNDO = 3.2;
const ALTURA_CAMERA = 1.05;
const QUADRO_MS = 1000 / 30;

function suavizar(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// Relevo barato por soma de senos: vale plano no centro, cristas nas laterais.
function altura(x: number, z: number) {
  const lateral = suavizar(0.35, 1.7, Math.abs(x));
  const ruido =
    0.55 +
    0.25 * Math.sin(x * 2.1 + z * 0.9) +
    0.12 * Math.sin(x * 4.7 - z * 1.7 + 1.3) +
    0.08 * Math.sin(x * 9.3 + z * 3.1);
  return lateral * (0.15 + 1.0 * lateral) * ruido;
}

/** Terreno em wireframe com vale dourado. Pausa fora da viewport e com aba oculta. */
export function TerrainCanvas({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const preferencia = window.matchMedia(SEM_MOVIMENTO);
    let parado = preferencia.matches;
    let largura = 0;
    let alturaTela = 0;
    let linhas = 0;
    let colunas = 0;
    let tempo = 0;
    let ultimo = 0;
    let quadro = 0;
    let visivel = false;

    const desenhar = () => {
      const w = largura;
      const h = alturaTela;
      if (!w || !h) return;
      // Cada frame começa opaco e claro, sem acumular modos de composição.
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      const horizonte = h * 0.08;
      const focoX = Math.min(Math.max(w * 0.34, 240), 560);
      const focoY = h * 0.98;
      const projetar = (x: number, y: number, z: number): [number, number] => [
        w / 2 + (x / z) * focoX,
        horizonte + ((ALTURA_CAMERA - y) / z) * focoY,
      ];

      ctx.fillStyle = FUNDO;
      ctx.fillRect(0, 0, w, h);

      const traco = ctx.createLinearGradient(0, 0, w, 0);
      traco.addColorStop(0, "rgba(167,150,106,0.24)");
      traco.addColorStop(0.3, "rgba(167,150,106,0.28)");
      traco.addColorStop(0.42, "rgba(167,125,22,0.55)");
      traco.addColorStop(0.5, "rgba(167,125,22,0.55)");
      traco.addColorStop(0.58, "rgba(167,125,22,0.55)");
      traco.addColorStop(0.7, "rgba(167,150,106,0.28)");
      traco.addColorStop(1, "rgba(167,150,106,0.24)");
      ctx.lineWidth = 1;
      ctx.lineJoin = "round";

      // Do fundo para a frente: cada linha cobre a anterior (algoritmo do pintor).
      for (let i = linhas; i >= 0; i--) {
        const z = Z_PERTO + (i / linhas) * PROFUNDIDADE;
        const linha = new Path2D();
        for (let j = 0; j <= colunas; j++) {
          const x = -LARGURA_MUNDO + (j / colunas) * LARGURA_MUNDO * 2;
          const [sx, sy] = projetar(x, altura(x, z + tempo), z);
          if (j === 0) linha.moveTo(sx, sy);
          else linha.lineTo(sx, sy);
        }
        const cobertura = new Path2D(linha);
        cobertura.lineTo(w, h);
        cobertura.lineTo(0, h);
        cobertura.closePath();
        ctx.fillStyle = FUNDO;
        ctx.fill(cobertura);

        ctx.globalAlpha = 0.25 + 0.75 * (1 - i / linhas);
        ctx.strokeStyle = traco;
        ctx.stroke(linha);
        ctx.globalAlpha = 1;
      }

      // Grade dourada no piso do vale.
      ctx.strokeStyle = "rgba(167,125,22,0.22)";
      ctx.beginPath();
      for (let x = -0.5; x <= 0.5001; x += 0.0625) {
        const [x0, y0] = projetar(x, 0, Z_PERTO);
        const [x1, y1] = projetar(x, 0, Z_PERTO + PROFUNDIDADE);
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
      }
      ctx.stroke();

      // Luz dourada translúcida sobre o marfim, sem escurecer a superfície.
      const brilho = ctx.createRadialGradient(w / 2, h * 0.62, 0, w / 2, h * 0.62, Math.max(w * 0.32, 220));
      brilho.addColorStop(0, "rgba(233,207,122,0.18)");
      brilho.addColorStop(0.45, "rgba(233,207,122,0.06)");
      brilho.addColorStop(1, "rgba(212,175,55,0)");
      ctx.fillStyle = brilho;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";
    };

    const laco = (agora: number) => {
      quadro = requestAnimationFrame(laco);
      if (agora - ultimo < QUADRO_MS) return;
      tempo += Math.min(agora - ultimo, 100) * 0.00018;
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
      alturaTela = canvas.clientHeight;
      canvas.width = Math.round(largura * dpr);
      canvas.height = Math.round(alturaTela * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const pequeno = largura < 768;
      linhas = pequeno ? 26 : 42;
      colunas = pequeno ? 72 : 140;
      desenhar();
    };

    const aoMudarAba = () => (document.hidden ? parar() : iniciar());
    const aoMudarPreferencia = () => {
      parado = preferencia.matches;
      if (parado) { parar(); desenhar(); }
      else iniciar();
    };

    const observadorTamanho = new ResizeObserver(redimensionar);
    observadorTamanho.observe(canvas);
    const observadorVisao = new IntersectionObserver((entradas) => {
      visivel = entradas[0]?.isIntersecting ?? false;
      if (visivel) iniciar();
      else parar();
    });
    observadorVisao.observe(canvas);
    document.addEventListener("visibilitychange", aoMudarAba);
    preferencia.addEventListener("change", aoMudarPreferencia);

    return () => {
      parar();
      observadorTamanho.disconnect();
      observadorVisao.disconnect();
      document.removeEventListener("visibilitychange", aoMudarAba);
      preferencia.removeEventListener("change", aoMudarPreferencia);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
}
