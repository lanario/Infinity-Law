"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const COM_MOVIMENTO = "(prefers-reduced-motion: no-preference)";
const useEfeitoDeLayout = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Coreografia da landing: entrada do hero, revelação no scroll, parallax, contadores e holofote dos cards. */
export function LandingMotion({ children }: { children: ReactNode }) {
  const raizRef = useRef<HTMLDivElement>(null);

  useEfeitoDeLayout(() => {
    const raiz = raizRef.current;
    if (!raiz) return;
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia(raiz);

    mm.add(COM_MOVIMENTO, () => {
      const q = gsap.utils.selector(raiz);

      gsap
        .timeline({ defaults: { ease: "expo.out", duration: 1.2 } })
        .set(q("[data-hero]"), { animation: "none" })
        .set(q("[data-hero-word]"), { animation: "none" })
        .fromTo(q("[data-hero='pilula']"), { opacity: 0, y: 14, filter: "blur(6px)" }, { opacity: 1, y: 0, filter: "blur(0px)" }, 0.1)
        .set(q("[data-hero='titulo']"), { opacity: 1 }, 0.2)
        .fromTo(q("[data-hero-word]"), { yPercent: 110 }, { yPercent: 0, duration: 1.3, stagger: 0.07 }, 0.2)
        .fromTo(q("[data-hero='texto']"), { opacity: 0, y: 18 }, { opacity: 1, y: 0 }, 0.65)
        .fromTo(q("[data-hero='acoes']"), { opacity: 0, y: 18 }, { opacity: 1, y: 0 }, 0.78)
        .fromTo(q("[data-hero='nota']"), { opacity: 0 }, { opacity: 1, duration: 1 }, 0.95)
        .fromTo(q("[data-hero='palco']"), { opacity: 0, y: 40, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 1.6 }, 0.45)
        .fromTo(q("[data-hero='terreno']"), { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 1.8, ease: "power3.out" }, 0.3);

      const hero = q("[data-hero-secao]")[0];
      if (hero) {
        const rolagem = { trigger: hero, start: "top top", end: "bottom top", scrub: true };
        gsap.to(q("[data-hero-parallax]"), { yPercent: -18, opacity: 0, ease: "none", scrollTrigger: rolagem });
        gsap.to(q("[data-terreno-parallax]"), { yPercent: 14, ease: "none", scrollTrigger: rolagem });
      }

      const revelar = q("[data-reveal]");
      gsap.set(revelar, { opacity: 0, y: 28 });
      ScrollTrigger.batch(revelar, {
        start: "top 88%",
        once: true,
        onEnter: (lote) =>
          gsap.to(lote, { opacity: 1, y: 0, duration: 1, ease: "expo.out", stagger: 0.08, overwrite: true }),
      });

      q("[data-count]").forEach((el) => {
        const alvo = Number(el.getAttribute("data-count"));
        const estado = { valor: 0 };
        el.textContent = "0";
        ScrollTrigger.create({
          trigger: el,
          start: "top 90%",
          once: true,
          onEnter: () =>
            gsap.to(estado, {
              valor: alvo,
              duration: 1.6,
              ease: "power3.out",
              onUpdate: () => {
                el.textContent = String(Math.round(estado.valor));
              },
            }),
        });
      });

      const passos = q("[data-passos]")[0];
      if (passos) {
        passos.classList.add("lp-passos-vivos");
        gsap.fromTo(
          q("[data-passos-linha]"),
          { scaleY: 0 },
          { scaleY: 1, ease: "none", scrollTrigger: { trigger: passos, start: "top 60%", end: "bottom 60%", scrub: true } },
        );
        q("[data-passo]").forEach((passo) =>
          ScrollTrigger.create({ trigger: passo, start: "top 62%", end: "max", toggleClass: "is-active" }),
        );
      }

      return () => passos?.classList.remove("lp-passos-vivos");
    });

    return () => {
      mm.revert();
      document.documentElement.classList.remove("lp-anim");
    };
  }, []);

  useEffect(() => {
    const raiz = raizRef.current;
    if (!raiz || !window.matchMedia("(hover: hover)").matches) return;
    const mover = (evento: PointerEvent) => {
      const card = (evento.target as Element).closest<HTMLElement>("[data-spotlight]");
      if (!card) return;
      const caixa = card.getBoundingClientRect();
      card.style.setProperty("--x", `${evento.clientX - caixa.left}px`);
      card.style.setProperty("--y", `${evento.clientY - caixa.top}px`);
    };
    raiz.addEventListener("pointermove", mover, { passive: true });
    return () => raiz.removeEventListener("pointermove", mover);
  }, []);

  return (
    <div ref={raizRef} className="lp-root min-h-screen">
      {children}
    </div>
  );
}
