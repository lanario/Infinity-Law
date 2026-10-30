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
import { LandingFooter } from "./landing-footer";
import { LandingMotion } from "./landing-motion";
import { HeroFundo } from "./hero-fundo";
import { HeroTelas } from "./hero-telas";
import { LandingNav } from "./landing-nav";
import { Logo } from "@/components/ui/logo";

// Marca o documento antes da pintura para o hero entrar animado sem piscar.
const SCRIPT_MOVIMENTO = `try{if(matchMedia("(prefers-reduced-motion: no-preference)").matches)document.documentElement.classList.add("lp-anim")}catch(e){}`;

const AREAS = [
  "Direito Civil",
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

type Modulo = { icone: LucideIcon; titulo: string; texto: string };

const MODULOS: Modulo[] = [
  {
    icone: FileSearch,
    titulo: "Processos",
    texto: "Consulta por número CNJ, movimentações sincronizadas e aviso da última atualização de cada caso.",
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
  },
];

// Ilustrações decorativas (aria-hidden): o texto de cada cartão carrega o conteúdo.
function IlustracaoIsolamento() {
  return (
    <div className="lp-seg-cofres">
      {["Escritório A", "Seu escritório", "Escritório C"].map((nome, i) => (
        <div key={nome} className={`lp-seg-cofre ${i === 1 ? "is-seu" : ""}`}>
          <Lock className="h-4 w-4" />
          <span>{nome}</span>
          <i />
          <i />
          <i />
        </div>
      ))}
      <span className="lp-seg-rls lp-seg-rls-1">RLS</span>
      <span className="lp-seg-rls lp-seg-rls-2">RLS</span>
    </div>
  );
}

function IlustracaoCargos() {
  const cargos: [string, boolean[]][] = [
    ["Sócio", [true, true, true]],
    ["Advogado", [true, true, false]],
    ["Estagiário", [true, false, false]],
  ];
  return (
    <div className="lp-seg-cargos">
      <div className="lp-seg-cargos-topo">
        <span />
        <span>Ler</span>
        <span>Editar</span>
        <span>Excluir</span>
      </div>
      {cargos.map(([cargo, acessos]) => (
        <div key={cargo} className="lp-seg-cargos-linha">
          <span>{cargo}</span>
          {acessos.map((ligado, i) => (
            <span key={i} className={`lp-seg-chave ${ligado ? "is-ligada" : ""}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

function IlustracaoRegistro() {
  const eventos = [
    ["09:12", "Dra. Paula", "editou prazo"],
    ["09:40", "Marcos", "anexou documento"],
    ["10:05", "Ana", "exportou relatório"],
    ["10:31", "Dra. Paula", "alterou cargo"],
  ];
  return (
    <div className="lp-seg-log">
      <ul className="lp-seg-log-trilha">
        {[0, 1].map((copia) =>
          eventos.map(([hora, quem, acao]) => (
            <li key={`${copia}-${hora}`}>
              <span className="lp-seg-log-hora">{hora}</span>
              <span className="lp-seg-log-ponto" />
              <span>
                <b>{quem}</b> {acao}
              </span>
            </li>
          )),
        )}
      </ul>
    </div>
  );
}

function IlustracaoLgpd() {
  return (
    <div className="lp-seg-lgpd">
      <span className="lp-seg-escudo">
        <ShieldCheck className="h-8 w-8" />
      </span>
      <ul>
        {["Finalidade definida", "Acesso mínimo necessário", "Conexão criptografada"].map((item) => (
          <li key={item}>
            <Check className="h-3.5 w-3.5" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

const SEGURANCA = [
  {
    icone: Lock,
    titulo: "Isolamento por escritório",
    texto: "Cada escritório só enxerga os próprios dados. As regras de acesso são aplicadas no banco, linha a linha.",
    Ilustracao: IlustracaoIsolamento,
    classe: "lg:col-span-4",
  },
  {
    icone: KeyRound,
    titulo: "Acesso pelo cargo",
    texto: "Permissões por módulo e por ação. Quem cuida da agenda não precisa ver o financeiro.",
    Ilustracao: IlustracaoCargos,
    classe: "lg:col-span-2",
  },
  {
    icone: ScrollText,
    titulo: "Registro de ações",
    texto: "Operações sensíveis ficam registradas para o escritório saber quem fez o quê e quando.",
    Ilustracao: IlustracaoRegistro,
    classe: "lg:col-span-2",
  },
  {
    icone: ShieldCheck,
    titulo: "Pensado para a LGPD",
    texto: "Dados de clientes tratados com finalidade definida, acesso mínimo necessário e conexão sempre criptografada.",
    Ilustracao: IlustracaoLgpd,
    classe: "lg:col-span-4",
  },
];

const PLANOS = [
  {
    nome: "Basic",
    para: "Para quem advoga sozinho ou começa a estruturar o escritório.",
    preco: ["89", "90"],
    itens: ["Processos, clientes e agenda", "Consulta DataJud por número CNJ", "Relatórios em PDF e Excel"],
    destaque: false,
  },
  {
    nome: "Pro",
    para: "Para escritórios com equipe e volume de processos crescente.",
    preco: ["149", "90"],
    itens: ["Tudo do Basic", "Intimações do DJEN por OAB", "Financeiro e comunicação por WhatsApp", "Cargos e permissões"],
    destaque: true,
  },
  {
    nome: "Plus",
    para: "Para operações maiores, com várias equipes trabalhando juntas.",
    preco: ["229", "90"],
    itens: ["Tudo do Pro", "Implantação acompanhada", "Pensado para várias equipes"],
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
      "O Basic custa R$ 89,90, o Pro R$ 149,90 e o Plus R$ 229,90 por mês, por escritório. Veja o que cada um inclui na seção Planos.",
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
    <div className="lp-section-heading max-w-3xl" data-reveal>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#805F11]">{rotulo}</p>
      <h2 className="lp-titulo mt-4 text-[clamp(2rem,4.4vw,3.25rem)] tracking-[-0.045em]">
        <span className="text-[#17191a]">{titulo}</span> <span className="lp-cinza">{destaque}</span>
      </h2>
      {texto && <p className="mt-5 max-w-2xl text-base leading-relaxed text-neutral-600 sm:text-lg">{texto}</p>}
    </div>
  );
}

function CartaoModulo({ modulo }: { modulo: Modulo }) {
  const Icone = modulo.icone;
  return (
    <article className="lp-modulo-cartao" data-reveal>
      <span className="lp-icone"><Icone className="h-5 w-5" aria-hidden="true" /></span>
      <div>
        <h3>{modulo.titulo}</h3>
        <p>{modulo.texto}</p>
      </div>
    </article>
  );
}

export function LandingPage() {
  return (
    <LandingMotion>
      <script dangerouslySetInnerHTML={{ __html: SCRIPT_MOVIMENTO }} />
      <a
        href="#conteudo"
        className="sr-only z-[60] rounded-full bg-[#17191a] px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Pular para o conteúdo
      </a>
      <LandingNav />

      <main id="conteudo">
        {/* Hero */}
        <section id="inicio" data-hero-secao className="lp-hero relative isolate flex min-h-[100svh] flex-col overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div data-fundo-parallax data-hero="fundo" className="absolute inset-0">
              <HeroFundo />
            </div>
            <div className="absolute left-1/2 top-[-20%] h-[70%] w-[90%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(212,175,55,0.14),transparent)]" />
            <div className="absolute inset-y-0 left-[max(1rem,calc(50%-36rem))] w-px bg-gradient-to-b from-transparent via-black/[0.06] to-transparent" />
            <div className="absolute inset-y-0 right-[max(1rem,calc(50%-36rem))] w-px bg-gradient-to-b from-transparent via-black/[0.06] to-transparent" />
          </div>

          <div
            data-hero-parallax
            className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-10 px-4 pb-4 pt-28 sm:px-6 sm:pt-32 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:gap-8 lg:pt-36"
          >
            <div className="lp-hero-copy">
              <p data-hero="pilula" className="lp-pilula">
                <span className="lp-ponto" aria-hidden="true" />
                Gestão jurídica com DataJud e DJEN
              </p>
              <h1
                data-hero="titulo"
                className="lp-titulo mt-7 text-[clamp(2.6rem,9vw,4.75rem)] lg:text-[clamp(3.25rem,4.25vw,3.75rem)]"
              >
                <span className="block text-[#17191a]">
                  <Palavras texto="Seu escritório," />
                </span>
                {/* background-clip: text não atravessa filhos transformados; o gradiente vai em cada palavra. */}
                <span className="block">
                  <Palavras texto="sem prazo perdido." className="lp-cinza" />
                </span>
              </h1>
              <p data-hero="texto" className="mt-7 max-w-lg text-base leading-relaxed text-neutral-600 sm:text-lg">
                Processos sincronizados, intimações monitoradas, agenda da equipe, financeiro e comunicação com clientes
                em um só sistema, feito para a rotina da advocacia brasileira.
              </p>
              <div data-hero="acoes" className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/signup" className="lp-btn lp-btn-ouro h-12 w-full px-6 text-[15px] sm:w-auto">
                  Criar conta do escritório
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link href="/login" className="lp-btn lp-btn-claro h-12 w-full px-6 text-[15px] sm:w-auto">
                  Já tenho conta
                </Link>
              </div>
              <p data-hero="nota" className="mt-6 max-w-sm text-xs leading-relaxed text-[#66666b]">
                Sem instalação. Dados isolados por escritório e acesso controlado por cargo.
              </p>
            </div>

            <div data-hero="palco" className="lp-hero-palco">
              <div data-scene-parallax><HeroTelas /></div>
            </div>
          </div>
        </section>

        {/* Prova social e números */}
        <section aria-labelledby="lp-numeros-titulo" className="lp-numeros relative border-y border-black/[0.06] bg-white/60">
          <h2 id="lp-numeros-titulo" className="sr-only">
            Para quem é e números do produto
          </h2>
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20">
            <p className="text-center text-sm text-neutral-600" data-reveal>
              Feito para escritórios de todas as áreas do Direito
            </p>
            <div className="lp-faixa-mascara mt-6 overflow-hidden" data-reveal>
              <ul className="lp-marquee">
                {[0, 1].map((copia) =>
                  AREAS.map((area) => (
                    <li
                      key={`${copia}-${area}`}
                      aria-hidden={copia === 1 || undefined}
                      className="flex shrink-0 items-center gap-6 pr-6 text-lg font-medium tracking-tight text-[#66666b] sm:text-xl"
                    >
                      {area}
                      <span className="h-1 w-1 rounded-full bg-[#A77D16]" aria-hidden="true" />
                    </li>
                  )),
                )}
              </ul>
            </div>

          </div>
        </section>

        {/* Como funciona */}
        <section id="como-funciona" className="lp-section">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:py-20 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-20 lg:py-28">
            <div className="lg:sticky lg:top-32 lg:self-start">
              <Cabecalho
                rotulo="Como funciona"
                titulo="Do cadastro ao fechamento do mês."
                destaque="Em cinco passos."
                texto="A Infinity Law organiza o trabalho na ordem em que ele acontece no escritório, e as fontes oficiais fazem a parte repetitiva."
              />
            </div>

            <ol data-passos className="relative">
              <span aria-hidden="true" className="absolute bottom-6 left-[1.375rem] top-6 w-px bg-black/[0.08]" />
              <span
                aria-hidden="true"
                data-passos-linha
                className="absolute bottom-6 left-[1.375rem] top-6 w-px origin-top bg-gradient-to-b from-[#E9CF7A] via-[#D4AF37] to-[#805F11]"
              />
              {PASSOS.map((passo, indice) => {
                const Icone = passo.icone;
                return (
                  <li key={passo.titulo} data-passo className="lp-passo relative flex gap-5 pb-12 last:pb-0 sm:gap-7">
                    <span className="lp-passo-numero relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#D4AF37]/50 bg-[#FBF6E9] text-[#805F11] shadow-[0_0_24px_-4px_rgba(212,175,55,0.55)]">
                      <Icone className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="pt-1.5">
                      <p className="text-xs font-semibold tabular-nums text-[#66666b]">Passo {indice + 1}</p>
                      <h3 className="mt-1 text-xl font-semibold tracking-tight text-[#17191a] sm:text-2xl">{passo.titulo}</h3>
                      <p className="mt-2 max-w-md leading-relaxed text-neutral-600">{passo.texto}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* Módulos */}
        <section id="modulos" className="lp-section lp-modulos border-t border-black/[0.06]">
          <div className="lp-section-luz" data-parallax="70" aria-hidden="true" />
          <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20 sm:px-6 lg:py-28">
            <Cabecalho
              rotulo="Módulos"
              titulo="Tudo que o escritório usa no dia a dia."
              destaque="Conectado."
              texto="Seis frentes de trabalho conectadas a uma única base, com permissões e segurança aplicadas em todo o sistema."
            />

            <div className="lp-modulos-mapa mt-12" aria-label="Módulos conectados da Infinity Law">
              <svg className="lp-modulos-linhas" viewBox="0 0 1200 620" aria-hidden="true" preserveAspectRatio="none">
                <path className="lp-modulos-conexao" pathLength="1" d="M350 105C405 105 415 248 450 290" />
                <path className="lp-modulos-conexao" pathLength="1" d="M350 310H450" />
                <path className="lp-modulos-conexao" pathLength="1" d="M350 515C405 515 415 372 450 330" />
                <path className="lp-modulos-conexao" pathLength="1" d="M850 105C795 105 785 248 750 290" />
                <path className="lp-modulos-conexao" pathLength="1" d="M850 310H750" />
                <path className="lp-modulos-conexao" pathLength="1" d="M850 515C795 515 785 372 750 330" />
              </svg>
              <div className="lp-modulos-coluna lp-modulos-coluna-esquerda">
                {MODULOS.slice(0, 3).map((modulo) => <CartaoModulo key={modulo.titulo} modulo={modulo} />)}
              </div>
              <div className="lp-modulos-nucleo" data-reveal>
                <Logo showText={false} size="lg" className="lp-modulos-logo" />
                <span className="sr-only">Infinity Law: núcleo que conecta os módulos do sistema.</span>
              </div>
              <div className="lp-modulos-coluna lp-modulos-coluna-direita">
                {MODULOS.slice(3, 6).map((modulo) => <CartaoModulo key={modulo.titulo} modulo={modulo} />)}
              </div>
            </div>
          </div>
        </section>

        {/* Segurança e LGPD */}
        <section id="seguranca" className="lp-section lp-seguranca border-t border-black/[0.06] bg-white/60">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:py-28">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
              <Cabecalho
                rotulo="Segurança e LGPD"
                titulo="Sigilo profissional começa"
                destaque="na arquitetura."
              />
              <p className="max-w-md text-base leading-relaxed text-neutral-600 sm:text-lg lg:pb-2" data-reveal>
                Dados de clientes são sensíveis. Por isso o isolamento entre escritórios e o controle de acesso ficam no
                núcleo do sistema.
              </p>
            </div>

            <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
              {SEGURANCA.map(({ icone: Icone, titulo, texto, Ilustracao, classe }) => (
                <li key={titulo} data-spotlight data-reveal className={`lp-card lp-seg-cartao flex flex-col ${classe}`}>
                  <div className="lp-seg-palco" aria-hidden="true">
                    <Ilustracao />
                  </div>
                  <div className="flex items-start gap-3 p-6 pt-5">
                    <span className="lp-icone">
                      <Icone className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight text-[#17191a]">{titulo}</h3>
                      <p className="mt-1.5 text-[15px] leading-relaxed text-neutral-600">{texto}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Planos */}
        <section id="planos" className="lp-section lp-planos overflow-hidden border-t border-black/[0.06]">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <HeroFundo />
          </div>
          <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20 sm:px-6 lg:py-28">
            <Cabecalho
              rotulo="Planos"
              titulo="Um plano para cada fase"
              destaque="do escritório."
              texto="Preço mensal por escritório. Todos os planos incluem processos, clientes, agenda e consulta ao DataJud."
            />

            <ul className="mt-14 grid gap-5 lg:grid-cols-3 lg:items-stretch">
              {PLANOS.map((plano) => (
                <li
                  key={plano.nome}
                  data-spotlight
                  data-reveal
                  className={`lp-card lp-plano flex flex-col p-7 sm:p-8 ${plano.destaque ? "lp-plano-destaque" : ""}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xl font-semibold tracking-tight text-[#17191a]">{plano.nome}</h3>
                    {plano.destaque && <span className="lp-plano-selo">Recomendado</span>}
                  </div>
                  <p className="lp-plano-descricao mt-2 text-sm leading-relaxed text-neutral-600">{plano.para}</p>
                  <p className="lp-plano-preco mt-6">
                    <span className="lp-plano-moeda">R$</span>
                    <span className="lp-plano-inteiro">{plano.preco[0]}</span>
                    <span className="lp-plano-centavos">,{plano.preco[1]}</span>
                    <span className="lp-plano-periodo">/mês</span>
                  </p>
                  <p className="mt-1 text-xs text-[#66666b]">por escritório</p>
                  <Link
                    href="/signup"
                    className={`lp-btn mt-7 h-12 px-5 text-sm ${plano.destaque ? "lp-btn-ouro" : "lp-btn-claro"}`}
                  >
                    Assinar o {plano.nome}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <p className="lp-plano-inclui mt-7">Inclui</p>
                  <ul className="mt-4 space-y-3 text-sm">
                    {plano.itens.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-neutral-700">
                        <span className="lp-plano-check" aria-hidden="true">
                          <Check className="h-3 w-3" />
                        </span>
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
        <section id="duvidas" className="lp-section lp-duvidas border-t border-black/[0.06]">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:py-20 sm:px-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-20 lg:py-28">
            <Cabecalho rotulo="Dúvidas" titulo="Perguntas" destaque="frequentes." />
            <div className="divide-y divide-black/[0.08] border-y border-black/[0.08]">
              {PERGUNTAS.map((item) => (
                <details key={item.pergunta} className="lp-faq group" data-reveal>
                  <summary className="flex cursor-pointer items-center justify-between gap-6 py-6 text-left text-base font-medium text-[#17191a] transition-colors hover:text-[#805F11] sm:text-lg">
                    {item.pergunta}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/10 bg-black/[0.03]">
                      <Plus className="lp-faq-icone h-4 w-4" aria-hidden="true" />
                    </span>
                  </summary>
                  <p className="max-w-2xl pb-6 pr-12 leading-relaxed text-neutral-600">{item.resposta}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="lp-section lp-cta relative isolate overflow-hidden border-t border-black/[0.06]">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 -z-10 h-[80%] bg-[radial-gradient(50%_70%_at_50%_100%,rgba(212,175,55,0.2),rgba(212,175,55,0.05)_55%,transparent_80%)]"
          />
          <div
            aria-hidden="true"
            data-parallax="60"
            className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(23,25,26,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(23,25,26,0.05)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(60%_60%_at_50%_70%,#000,transparent)]"
          />
          <div className="mx-auto max-w-4xl px-4 py-16 sm:py-20 text-center sm:px-6 lg:py-28" data-reveal>
            <h2 className="lp-titulo text-[clamp(2.4rem,6.5vw,5.5rem)]">
              <span className="block text-[#17191a]">Menos planilha.</span>
              <span className="lp-cinza block">Mais advocacia.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-neutral-600 sm:text-lg">
              Crie a conta do escritório e tenha processos, prazos e clientes no mesmo lugar ainda hoje.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/signup" className="lp-btn lp-btn-ouro h-12 w-full px-6 text-[15px] sm:w-auto">
                Criar conta do escritório
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/login" className="lp-btn lp-btn-claro h-12 w-full px-6 text-[15px] sm:w-auto">
                Entrar
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </LandingMotion>
  );
}
