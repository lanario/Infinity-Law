import Link from "next/link";
import { ArrowUp, ArrowUpRight, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/ui/logo";

export function LandingFooter() {
  return (
    <footer className="lp-footer" aria-label="Rodapé">
      <div className="lp-footer-orbita" data-parallax="45" aria-hidden="true">
        <svg viewBox="0 0 800 340" fill="none">
          <path d="M400 170C320 55 250 35 170 60C40 100 40 255 170 280C270 300 330 245 400 170C470 95 530 40 630 60C760 85 760 240 630 280C550 305 480 285 400 170Z" />
          <path d="M400 170C320 55 250 35 170 60C40 100 40 255 170 280C270 300 330 245 400 170C470 95 530 40 630 60C760 85 760 240 630 280C550 305 480 285 400 170Z" className="lp-footer-traco" />
        </svg>
      </div>
      <div className="relative mx-auto max-w-6xl px-5 pt-16 sm:px-6 lg:pt-24">
        <div className="lp-footer-topo" data-reveal>
          <p className="max-w-xl text-3xl font-medium leading-tight tracking-[-0.04em] sm:text-4xl">
            Sua próxima fase.<br />
            <span className="text-[#805F11]">Infinitas possibilidades.</span>
          </p>
          <a href="#inicio" className="lp-footer-voltar">
            Voltar ao início <span><ArrowUp className="h-4 w-4" aria-hidden="true" /></span>
          </a>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-12 py-12 lg:grid-cols-[2fr_1fr_1fr] lg:py-16">
          <div className="col-span-2 lg:col-span-1" data-reveal>
            <Link href="#inicio" aria-label="Infinity Law, início" className="inline-flex"><Logo size="lg" /></Link>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-neutral-600">
              Processos, prazos e pessoas conectados. Gestão jurídica feita para a rotina da advocacia brasileira.
            </p>
            <p className="mt-6 inline-flex items-center gap-2 text-xs text-[#805F11]">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Dados isolados por escritório
            </p>
          </div>
          <nav aria-label="Seções da página" data-reveal>
            <h2 className="text-sm font-semibold">Conheça o sistema</h2>
            <ul className="mt-5 space-y-3 text-sm">
              {[["como-funciona", "Como funciona"], ["modulos", "Módulos"], ["seguranca", "Segurança"], ["planos", "Planos"], ["duvidas", "Dúvidas"]].map(([id, texto]) => (
                <li key={id}><a href={`#${id}`} className="lp-footer-link">{texto}</a></li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Acesso" data-reveal>
            <h2 className="text-sm font-semibold">Seu escritório</h2>
            <ul className="mt-5 space-y-3 text-sm">
              <li><Link href="/login" className="lp-footer-link">Entrar no sistema</Link></li>
              <li><Link href="/signup" className="lp-footer-link">Criar conta <ArrowUpRight className="inline h-3.5 w-3.5" aria-hidden="true" /></Link></li>
              <li><Link href="/esqueci-senha" className="lp-footer-link">Recuperar acesso</Link></li>
            </ul>
            <p className="mt-6 max-w-[13rem] text-xs leading-relaxed text-neutral-500">No navegador. No computador ou no celular.</p>
          </nav>
        </div>
        <div className="lp-footer-assinatura" aria-hidden="true"><span data-footer-marca>Infinity Law</span></div>
        <div className="flex flex-col gap-3 border-t border-[#A77D16]/15 py-6 text-[11px] leading-relaxed text-neutral-500 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Infinity Law. Todos os direitos reservados.</p>
          <p>Dados processuais de fontes públicas do CNJ · DataJud e DJEN</p>
        </div>
      </div>
    </footer>
  );
}
