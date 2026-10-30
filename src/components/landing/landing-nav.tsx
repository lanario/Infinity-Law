"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/logo";

const LINKS = [
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#modulos", label: "Módulos" },
  { href: "#seguranca", label: "Segurança" },
  { href: "#planos", label: "Planos" },
  { href: "#duvidas", label: "Dúvidas" },
];

export function LandingNav() {
  const [rolou, setRolou] = useState(false);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 24);
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (evento: KeyboardEvent) => evento.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto]);

  return (
    <header className="fixed inset-x-0 top-3 z-50 px-4 sm:top-4">
      <nav
        aria-label="Principal"
        data-rolou={rolou || aberto}
        className="lp-nav mx-auto max-w-5xl rounded-2xl border border-black/[0.08] bg-white/70 backdrop-blur-xl"
      >
        <div className="flex h-14 items-center justify-between gap-3 pr-2">
          <Link href="/" aria-label="Infinity Law, início" className="lp-nav-marca flex h-full shrink-0 items-center whitespace-nowrap rounded-l-2xl px-4">
            <Logo size="sm" />
          </Link>

          <ul className="hidden items-center gap-1 lg:flex">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="lp-link rounded-full px-3 py-2 text-[13px] font-medium">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-1.5">
            <Link href="/login" className="lp-link hidden rounded-full px-3 py-2 text-[13px] font-medium sm:inline-flex">
              Entrar
            </Link>
            <Link href="/signup" className="lp-btn lp-btn-claro h-9 px-4 text-[13px]">
              Criar conta
            </Link>
            <button
              type="button"
              className="lp-link inline-flex h-9 w-9 items-center justify-center rounded-full lg:hidden"
              aria-expanded={aberto}
              aria-controls="lp-menu"
              aria-label={aberto ? "Fechar menu" : "Abrir menu"}
              onClick={() => setAberto((valor) => !valor)}
            >
              {aberto ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {aberto && (
          <ul id="lp-menu" className="border-t border-black/[0.08] p-2 lg:hidden">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setAberto(false)}
                  className="lp-link block rounded-xl px-3 py-3 text-sm font-medium hover:bg-black/[0.04]"
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li className="sm:hidden">
              <Link href="/login" className="lp-link block rounded-xl px-3 py-3 text-sm font-medium hover:bg-black/[0.04]">
                Entrar
              </Link>
            </li>
          </ul>
        )}
      </nav>
    </header>
  );
}
