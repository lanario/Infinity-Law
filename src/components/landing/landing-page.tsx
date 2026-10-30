import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  Check,
  FileBarChart,
  FileSearch,
  KeyRound,
  Lock,
  MessageCircle,
  Plus,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { LandingMotion } from "./landing-motion";
import { HeroTelas } from "./hero-telas";
import { LandingNav } from "./landing-nav";
import { TerrainCanvas } from "./terrain-canvas";

// Marca o documento antes da pintura para o hero entrar animado sem piscar.
const SCRIPT_MOVIMENTO = `try{if(matchMedia("(prefers-reduced-motion: no-preference)").matches)document.documentElement.classList.add("lp-anim")}catch(e){}`;

const AREAS = [
  "Cível",
  "Trabalhista",
  "Previdenciário",
  "Família e Sucessões",
  "Tributário",
  "Empresarial",
  "Criminal",
  "Consumidor",
  "Imobiliário",
  "Bancário",
];

// Números verificáveis no próprio produto (src/lib/cnj/tribunais.ts, módulos e permissões).
const NUMEROS = [
  { valor: 92, rotulo: "tribunais mapeados para consulta no DataJud" },
  { valor: 7, rotulo: "módulos integrados em um só sistema" },
  { valor: 3, rotulo: "níveis de acesso por módulo: ler, editar e excluir" },
  { valor: 2, rotulo: "formatos de relatório: PDF e Excel" },
];

const PASSOS = [
  {
    icone: Building2,
    titulo: "Cadastre o escritório",
    texto: "Crie a conta, convide a equipe e defina cargos com o acesso certo para cada pessoa.",
  },
  {
    icone: FileSearch,
    titulo: "Traga seus processos pelo número CNJ",
    texto: "Informe o número do processo e os dados de capa são buscados no DataJud para você revisar e salvar.",
  },
  {
    icone: RefreshCw,
    titulo: "Acompanhe as movimentações",
    texto: "Andamentos sincronizados pelo DataJud e intimações do DJEN monitoradas por OAB, com destaque para o que mudou.",
  },
  {
    icone: CalendarClock,
    titulo: "Organize prazos e audiências",
    texto: "Agenda com responsável por compromisso e visões de equipe, dia, semana e mês.",
  },
  {
    icone: FileBarChart,
    titulo: "Feche o mês com números",
    texto: "Honorários, parcelas e lançamentos no financeiro, com relatórios prontos para exportar.",
  },
];

type Modulo = { icone: LucideIcon; titulo: string; texto: string; classe?: string };

const MODULOS: Modulo[] = [
  {
    icone: FileSearch,
    titulo: "Processos",
    texto: "Consulta por número CNJ, movimentações sincronizadas e aviso da última atualização de cada caso.",
    classe: "lg:col-span-2",
  },
  { icone: Users, titulo: "Clientes", texto: "Cadastro, prontuário e documentos de cada cliente reunidos em uma ficha." },
  {
    icone: CalendarClock,
    titulo: "Agenda e Equipe",
    texto: "Prazos, audiências e compromissos com responsável, na linha do tempo da equipe ou no calendário.",
  },
  { icone: Wallet, titulo: "Financeiro", texto: "Honorários, parcelas e lançamentos com o resumo do período sempre à vista." },
  {
    icone: MessageCircle,
    titulo: "Comunicação",
    texto: "Mensagens por WhatsApp com modelos prontos e histórico do que foi enviado a cada cliente.",
  },
  { icone: FileBarChart, titulo: "Relatórios", texto: "Exportação em PDF e Excel para reuniões, clientes e controle interno." },
  {
    icone: UserCog,
    titulo: "Permissões multiusuário",
    texto: "Cargos com acesso por módulo e por ação. Cada pessoa vê e altera apenas o que o cargo permite.",
    classe: "sm:col-span-2",
  },
];

const MOVIMENTOS_EXEMPLO = [
  { quando: "Hoje", texto: "Juntada de petição", novo: true },
  { quando: "Ontem", texto: "Conclusos para decisão", novo: false },
  { quando: "12 out", texto: "Audiência designada", novo: false },
];

const MATRIZ_EXEMPLO = [
  { modulo: "Processos", acesso: [true, true, false] },
  { modulo: "Financeiro", acesso: [true, false, false] },
  { modulo: "Agenda", acesso: [true, true, true] },
];

const SEGURANCA = [
  {
    icone: Lock,
    titulo: "Isolamento por escritório",
    texto: "Cada escritório só enxerga os próprios dados. As regras de acesso são aplicadas no banco, linha a linha.",
  },
  {
    icone: KeyRound,
    titulo: "Acesso pelo cargo",
    texto: "Permissões por módulo e por ação. Quem cuida da agenda não precisa ver o financeiro.",
  },
  {
    icone: ScrollText,
    titulo: "Registro de ações",
    texto: "Operações sensíveis ficam registradas para o escritório saber quem fez o quê e quando.",
  },
  {
    icone: ShieldCheck,
    titulo: "Pensado para a LGPD",
    texto: "Dados de clientes tratados com finalidade definida, acesso mínimo necessário e conexão sempre criptografada.",
  },
];

const PLANOS = [
  {
    nome: "Starter",
    para: "Para quem advoga sozinho ou começa a estruturar o escritório.",
    itens: ["Processos, clientes e agenda", "Consulta DataJud por número CNJ", "Relatórios em PDF e Excel"],
    destaque: false,
  },
  {
    nome: "Profissional",
    para: "Para escritórios com equipe e volume de processos crescente.",
    itens: ["Tudo do Starter", "Intimações do DJEN por OAB", "Financeiro e comunicação por WhatsApp", "Cargos e permissões"],
    destaque: true,
  },
  {
    nome: "Enterprise",
    para: "Para operações maiores, com várias equipes e necessidades próprias.",
    itens: ["Tudo do Profissional", "Implantação acompanhada", "Condições sob medida"],
    destaque: false,
  },
];

const PERGUNTAS = [
  {
    pergunta: "O que são o DataJud e o DJEN?",
    resposta:
      "O DataJud é a base pública do CNJ com os dados e andamentos dos processos. O DJEN é o Diário de Justiça Eletrônico Nacional, onde saem as comunicações processuais. A Infinity Law consulta as duas fontes para manter seus processos e intimações em dia.",
  },
  {
    pergunta: "Preciso instalar alguma coisa?",
    resposta: "Não. O sistema roda no navegador, no computador ou no celular. Basta criar a conta do escritório e entrar.",
  },
  {
    pergunta: "Outros escritórios conseguem ver meus dados?",
    resposta:
      "Não. Cada escritório tem os dados isolados e as regras de acesso são aplicadas no próprio banco de dados, não só na tela.",
  },
  {
    pergunta: "Posso limitar o que cada pessoa da equipe acessa?",
    resposta:
      "Sim. Você cria cargos e define, módulo por módulo, se a pessoa pode ler, editar ou excluir. Administradores têm acesso total.",
  },
  {
    pergunta: "Consigo levar os dados para fora do sistema?",
    resposta: "Sim. Os relatórios podem ser exportados em PDF e em Excel a qualquer momento.",
  },
  {
    pergunta: "Quanto custa?",
    resposta:
      "Os valores dos planos ainda estão sendo definidos. Crie a conta do escritório e você será avisado antes de qualquer cobrança.",
  },
];

function Palavras({ texto, className }: { texto: string; className?: string }) {
  const palavras = texto.split(" ");
  return (
    <>
      {palavras.map((palavra, indice) => (
        <span key={indice}>
          <span className="lp-mascara">
            <span data-hero-word className={className}>
              {palavra}
            </span>
          </span>
          {indice < palavras.length - 1 ? " " : null}
        </span>
      ))}
    </>
  );
}

function Cabecalho({ rotulo, titulo, destaque, texto }: { rotulo: string; titulo: string; destaque: string; texto?: string }) {
  return (
    <div className="max-w-3xl" data-reveal>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E9CF7A]">{rotulo}</p>
      <h2 className="lp-titulo mt-4 text-[clamp(2.1rem,5vw,3.75rem)] leading-[1.02] tracking-[-0.045em]">
        <span className="text-white">{titulo}</span> <span className="lp-cinza">{destaque}</span>
      </h2>
      {texto && <p className="mt-5 max-w-2xl text-base leading-relaxed text-neutral-400 sm:text-lg">{texto}</p>}
    </div>
  );
}

export function LandingPage() {
  return (
    <LandingMotion>
      <script dangerouslySetInnerHTML={{ __html: SCRIPT_MOVIMENTO }} />
      <a
        href="#conteudo"
        className="sr-only z-[60] rounded-full bg-white px-4 py-2 text-sm font-semibold text-black focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Pular para o conteúdo
      </a>
      <LandingNav />

      <main id="conteudo">
        {/* Hero */}
        <section data-hero-secao className="relative isolate flex min-h-[100svh] flex-col overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-[-20%] h-[70%] w-[90%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.07),transparent)]" />
            <div className="absolute inset-y-0 left-[max(1rem,calc(50%-36rem))] w-px bg-gradient-to-b from-transparent via-white/[0.06] to-transparent" />
            <div className="absolute inset-y-0 right-[max(1rem,calc(50%-36rem))] w-px bg-gradient-to-b from-transparent via-white/[0.06] to-transparent" />
          </div>

          <div
            data-hero-parallax
            className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)] 2xl:max-w-7xl items-center gap-10 px-4 pb-4 pt-28 sm:px-6 sm:pt-32 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:gap-8 lg:pt-36"
          >
            <div>
              <p data-hero="pilula" className="lp-pilula">
                <span className="lp-ponto" aria-hidden="true" />
                Gestão jurídica com DataJud e DJEN
              </p>
              <h1
                data-hero="titulo"
                className="lp-titulo mt-7 text-[clamp(2.6rem,9vw,4.75rem)] lg:text-[clamp(3.25rem,4.25vw,3.75rem)]"
              >
                <span className="block text-white">
                  <Palavras texto="Seu escritório," />
                </span>
                {/* background-clip: text não atravessa filhos transformados; o gradiente vai em cada palavra. */}
                <span className="block">
                  <Palavras texto="sem prazo perdido." className="lp-cinza" />
                </span>
              </h1>
              <p data-hero="texto" className="mt-7 max-w-lg text-base leading-relaxed text-neutral-400 sm:text-lg">
                Processos sincronizados, intimações monitoradas, agenda da equipe, financeiro e comunicação com clientes
                em um só sistema, feito para a rotina da advocacia brasileira.
              </p>
              <div data-hero="acoes" className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/signup" className="lp-btn lp-btn-ouro h-12 w-full px-6 text-[15px] sm:w-auto">
                  Criar conta do escritório
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link href="/login" className="lp-btn lp-btn-escuro h-12 w-full px-6 text-[15px] sm:w-auto">
                  Já tenho conta
                </Link>
              </div>
              <p data-hero="nota" className="mt-6 max-w-sm text-xs leading-relaxed text-neutral-500">
                Sem instalação. Dados isolados por escritório e acesso controlado por cargo.
              </p>
            </div>

            <div data-hero="palco">
              <HeroTelas />
            </div>
          </div>

          <div data-terreno-parallax className="relative -mt-16 min-h-[300px] flex-1">
            <div data-hero="terreno" className="absolute inset-0">
              <TerrainCanvas className="h-full w-full [mask-image:linear-gradient(to_bottom,transparent,#000_30%,#000_85%,transparent)]" />
            </div>
          </div>
        </section>

        {/* Prova social e números */}
        <section aria-labelledby="lp-numeros-titulo" className="relative border-y border-white/[0.06] bg-[#070707]">
          <h2 id="lp-numeros-titulo" className="sr-only">
            Para quem é e números do produto
          </h2>
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20">
            <p className="text-center text-sm text-neutral-400" data-reveal>
              Feito para escritórios de todas as áreas do Direito
            </p>
            <div className="lp-faixa-mascara mt-6 overflow-hidden" data-reveal>
              <ul className="lp-marquee">
                {[0, 1].map((copia) =>
                  AREAS.map((area) => (
                    <li
                      key={`${copia}-${area}`}
                      aria-hidden={copia === 1 || undefined}
                      className="flex shrink-0 items-center gap-6 pr-6 text-lg font-medium tracking-tight text-neutral-500 sm:text-xl"
                    >
                      {area}
                      <span className="h-1 w-1 rounded-full bg-[#A77D16]" aria-hidden="true" />
                    </li>
                  )),
                )}
              </ul>
            </div>

            <dl className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.08] lg:grid-cols-4">
              {NUMEROS.map((numero) => (
                <div key={numero.rotulo} className="flex flex-col gap-2 bg-[#070707] p-5 sm:p-8" data-reveal>
                  <dt className="order-2 text-sm leading-snug text-neutral-400">{numero.rotulo}</dt>
                  <dd className="lp-titulo lp-dourado order-1 text-5xl tabular-nums sm:text-6xl" data-count={numero.valor}>
                    {numero.valor}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Como funciona */}
        <section id="como-funciona" className="scroll-mt-24">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-[88px] sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-20 lg:py-40">
            <div className="lg:sticky lg:top-32 lg:self-start">
              <Cabecalho
                rotulo="Como funciona"
                titulo="Do cadastro ao fechamento do mês."
                destaque="Em cinco passos."
                texto="A Infinity Law organiza o trabalho na ordem em que ele acontece no escritório, e as fontes oficiais fazem a parte repetitiva."
              />
            </div>

            <ol data-passos className="relative">
              <span aria-hidden="true" className="absolute bottom-6 left-[1.375rem] top-6 w-px bg-white/[0.08]" />
              <span
                aria-hidden="true"
                data-passos-linha
                className="absolute bottom-6 left-[1.375rem] top-6 w-px origin-top bg-gradient-to-b from-[#E9CF7A] via-[#D4AF37] to-[#805F11]"
              />
              {PASSOS.map((passo, indice) => {
                const Icone = passo.icone;
                return (
                  <li key={passo.titulo} data-passo className="lp-passo relative flex gap-5 pb-12 last:pb-0 sm:gap-7">
                    <span className="lp-passo-numero relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#D4AF37]/50 bg-[#141006] text-[#E9CF7A] shadow-[0_0_24px_-4px_rgba(212,175,55,0.55)]">
                      <Icone className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="pt-1.5">
                      <p className="text-xs font-semibold tabular-nums text-neutral-500">Passo {indice + 1}</p>
                      <h3 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">{passo.titulo}</h3>
                      <p className="mt-2 max-w-md leading-relaxed text-neutral-400">{passo.texto}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* Módulos */}
        <section id="modulos" className="scroll-mt-24 border-t border-white/[0.06]">
          <div className="mx-auto max-w-6xl px-4 py-[88px] sm:px-6 lg:py-40">
            <Cabecalho
              rotulo="Módulos"
              titulo="Tudo que o escritório usa no dia a dia."
              destaque="Conectado."
              texto="Sete módulos que conversam entre si: o processo leva ao cliente, o prazo vira compromisso e o honorário vira relatório."
            />

            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {MODULOS.map((modulo) => {
                const Icone = modulo.icone;
                return (
                  <article key={modulo.titulo} data-spotlight data-reveal className={`lp-card flex flex-col p-6 sm:p-7 ${modulo.classe ?? ""}`}>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <span className="lp-icone">
                        <Icone className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div>
                        <h3 className="text-lg font-semibold tracking-tight text-white">{modulo.titulo}</h3>
                        <p className="mt-1.5 text-[15px] leading-relaxed text-neutral-400">{modulo.texto}</p>
                      </div>
                    </div>

                    {modulo.titulo === "Processos" && (
                      <figure className="mt-6 rounded-2xl border border-white/[0.07] bg-black/40 p-4" aria-label="Exemplo ilustrativo de movimentações">
                        <figcaption className="flex items-center justify-between text-xs text-neutral-500">
                          <span className="font-mono tracking-normal">0000000-00.0000.8.26.0000</span>
                          <span>Exemplo</span>
                        </figcaption>
                        <ul className="mt-3 space-y-2">
                          {MOVIMENTOS_EXEMPLO.map((mov) => (
                            <li key={mov.texto} className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5 text-sm">
                              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${mov.novo ? "bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.9)]" : "bg-neutral-600"}`} aria-hidden="true" />
                              <span className="flex-1 text-neutral-200">{mov.texto}</span>
                              <span className="text-xs text-neutral-500">{mov.quando}</span>
                            </li>
                          ))}
                        </ul>
                      </figure>
                    )}

                    {modulo.titulo === "Permissões multiusuário" && (
                      <figure className="mt-6 overflow-x-auto rounded-2xl border border-white/[0.07] bg-black/40 p-4" aria-label="Exemplo ilustrativo de permissões de um cargo">
                        <table className="w-full min-w-[280px] text-sm">
                          <caption className="pb-2 text-left text-xs text-neutral-500">Cargo de exemplo: Assistente</caption>
                          <thead>
                            <tr className="text-xs text-neutral-500">
                              <th scope="col" className="pb-2 text-left font-medium">Módulo</th>
                              <th scope="col" className="pb-2 font-medium">Ler</th>
                              <th scope="col" className="pb-2 font-medium">Editar</th>
                              <th scope="col" className="pb-2 font-medium">Excluir</th>
                            </tr>
                          </thead>
                          <tbody>
                            {MATRIZ_EXEMPLO.map((linha) => (
                              <tr key={linha.modulo} className="border-t border-white/[0.06]">
                                <th scope="row" className="py-2.5 text-left font-normal text-neutral-200">{linha.modulo}</th>
                                {linha.acesso.map((permitido, indice) => (
                                  <td key={indice} className="py-2.5 text-center">
                                    {permitido ? (
                                      <Check className="mx-auto h-4 w-4 text-[#E9CF7A]" aria-label="Permitido" />
                                    ) : (
                                      <span className="text-neutral-600" aria-label="Sem acesso">—</span>
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </figure>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Segurança e LGPD */}
        <section id="seguranca" className="scroll-mt-24 border-t border-white/[0.06] bg-[#070707]">
          <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-[88px] sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:py-40">
            <div>
              <Cabecalho
                rotulo="Segurança e LGPD"
                titulo="Sigilo profissional começa"
                destaque="na arquitetura."
                texto="Dados de clientes são sensíveis. Por isso o isolamento entre escritórios e o controle de acesso ficam no núcleo do sistema."
              />
              <div aria-hidden="true" className="relative mx-auto mt-14 hidden h-56 w-56 lg:block" data-reveal>
                <span className="lp-anel h-56 w-56" />
                <span className="lp-anel h-40 w-40 [animation-delay:-2s]" />
                <span className="lp-anel h-24 w-24 [animation-delay:-4s]" />
                <span className="absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#D4AF37]/40 bg-[#141006] text-[#E9CF7A] shadow-[0_0_60px_-6px_rgba(212,175,55,0.6)]">
                  <ShieldCheck className="h-7 w-7" />
                </span>
              </div>
            </div>

            <ul className="grid gap-4 sm:grid-cols-2">
              {SEGURANCA.map((item) => {
                const Icone = item.icone;
                return (
                  <li key={item.titulo} data-spotlight data-reveal className="lp-card p-6">
                    <span className="lp-icone">
                      <Icone className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-5 text-lg font-semibold tracking-tight text-white">{item.titulo}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-neutral-400">{item.texto}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Planos */}
        <section id="planos" className="scroll-mt-24 border-t border-white/[0.06]">
          <div className="mx-auto max-w-6xl px-4 py-[88px] sm:px-6 lg:py-40">
            <Cabecalho
              rotulo="Planos"
              titulo="Um plano para cada fase"
              destaque="do escritório."
              texto="Os valores ainda estão em definição. Você pode criar a conta agora e será avisado antes de qualquer cobrança."
            />

            <ul className="mt-14 grid gap-4 lg:grid-cols-3">
              {PLANOS.map((plano) => (
                <li
                  key={plano.nome}
                  data-spotlight
                  data-reveal
                  className={`lp-card flex flex-col p-7 sm:p-8 ${plano.destaque ? "!border-[#D4AF37]/35 shadow-[0_0_0_1px_rgba(212,175,55,0.12),0_30px_80px_-40px_rgba(212,175,55,0.45)]" : ""}`}
                >
                  {plano.destaque && (
                    <span aria-hidden="true" className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#E9CF7A] to-transparent" />
                  )}
                  <h3 className="text-lg font-semibold tracking-tight text-white">{plano.nome}</h3>
                  <p className="mt-2 min-h-[3rem] text-sm leading-relaxed text-neutral-400">{plano.para}</p>
                  <p className="mt-6 flex items-baseline gap-1.5">
                    <span className="lp-titulo text-5xl text-white">R$ —</span>
                    <span className="text-sm text-neutral-500">/mês</span>
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">Valor em definição</p>
                  <Link
                    href="/signup"
                    className={`lp-btn mt-7 h-11 px-5 text-sm ${plano.destaque ? "lp-btn-ouro" : "lp-btn-escuro"}`}
                  >
                    Criar conta
                  </Link>
                  <ul className="mt-7 space-y-3 border-t border-white/[0.06] pt-6 text-sm">
                    {plano.itens.map((item) => (
                      <li key={item} className="flex gap-3 text-neutral-300">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D4AF37]" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section id="duvidas" className="scroll-mt-24 border-t border-white/[0.06]">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-[88px] sm:px-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-20 lg:py-40">
            <Cabecalho rotulo="Dúvidas" titulo="Perguntas" destaque="frequentes." />
            <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
              {PERGUNTAS.map((item) => (
                <details key={item.pergunta} className="lp-faq group" data-reveal>
                  <summary className="flex cursor-pointer items-center justify-between gap-6 py-6 text-left text-base font-medium text-white transition-colors hover:text-[#E9CF7A] sm:text-lg">
                    {item.pergunta}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
                      <Plus className="lp-faq-icone h-4 w-4" aria-hidden="true" />
                    </span>
                  </summary>
                  <p className="max-w-2xl pb-6 pr-12 leading-relaxed text-neutral-400">{item.resposta}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="relative isolate overflow-hidden border-t border-white/[0.06]">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 -z-10 h-[80%] bg-[radial-gradient(50%_70%_at_50%_100%,rgba(212,175,55,0.22),rgba(128,95,17,0.06)_55%,transparent_80%)]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(60%_60%_at_50%_70%,#000,transparent)]"
          />
          <div className="mx-auto max-w-4xl px-4 py-[88px] text-center sm:px-6 lg:py-40" data-reveal>
            <h2 className="lp-titulo text-[clamp(2.4rem,6.5vw,5.5rem)]">
              <span className="block text-white">Menos planilha.</span>
              <span className="lp-cinza block">Mais advocacia.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-neutral-400 sm:text-lg">
              Crie a conta do escritório e tenha processos, prazos e clientes no mesmo lugar ainda hoje.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/signup" className="lp-btn lp-btn-ouro h-12 w-full px-6 text-[15px] sm:w-auto">
                Criar conta do escritório
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/login" className="lp-btn lp-btn-escuro h-12 w-full px-6 text-[15px] sm:w-auto">
                Entrar
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] px-4 pb-8 pt-4 sm:px-6">
        <div className="lp-card mx-auto mt-8 max-w-6xl p-6 sm:p-10">
          <div className="grid gap-10 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <Logo size="sm" />
              <p className="mt-5 max-w-sm text-xl font-semibold leading-snug tracking-tight text-white">
                Gestão jurídica para escritórios de advocacia. <span className="text-neutral-500">Processos, prazos e clientes em um só lugar.</span>
              </p>
            </div>
            <nav aria-label="Seções da página">
              <h2 className="text-sm font-semibold text-white">Produto</h2>
              <ul className="mt-4 space-y-3 text-sm">
                <li><a href="#como-funciona" className="lp-link">Como funciona</a></li>
                <li><a href="#modulos" className="lp-link">Módulos</a></li>
                <li><a href="#seguranca" className="lp-link">Segurança</a></li>
                <li><a href="#planos" className="lp-link">Planos</a></li>
                <li><a href="#duvidas" className="lp-link">Dúvidas</a></li>
              </ul>
            </nav>
            <nav aria-label="Acesso">
              <h2 className="text-sm font-semibold text-white">Acesso</h2>
              <ul className="mt-4 space-y-3 text-sm">
                <li><Link href="/login" className="lp-link">Entrar</Link></li>
                <li><Link href="/signup" className="lp-link">Criar conta</Link></li>
                <li><Link href="/esqueci-senha" className="lp-link">Esqueci a senha</Link></li>
              </ul>
            </nav>
          </div>
          <div className="mt-10 flex flex-col gap-2 border-t border-white/[0.06] pt-6 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Infinity Law. Todos os direitos reservados.</p>
            <p>Dados processuais de fontes públicas do CNJ (DataJud e DJEN).</p>
          </div>
        </div>
      </footer>
    </LandingMotion>
  );
}
