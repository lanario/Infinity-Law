"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Bell,
  Building2,
  Check,
  ChevronRight,
  CircleUserRound,
  LockKeyhole,
  Palette,
  ShieldCheck,
  Users,
} from "lucide-react";
import { UsuariosPanel } from "@/components/configuracoes/usuarios-panel";
import { cn } from "@/lib/utils";
import type { PermissionsMap } from "@/types/permissions";

type Usuario = {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  cargo_id: string | null;
  cargos: { nome: string } | { nome: string }[] | null;
};

type Cargo = {
  id: string;
  nome: string;
  is_admin: boolean;
  permissoes: PermissionsMap;
};

type SectionId = "escritorio" | "equipe" | "seguranca" | "notificacoes" | "aparencia";

const sections: {
  id: SectionId;
  label: string;
  description: string;
  title: string;
  intro: string;
  icon: typeof Building2;
}[] = [
  {
    id: "escritorio",
    label: "Escritório e perfil",
    description: "Dados da conta",
    title: "Seu perfil",
    intro: "Informações da conta autenticada neste escritório.",
    icon: Building2,
  },
  {
    id: "equipe",
    label: "Equipe e permissões",
    description: "Usuários e cargos",
    title: "Equipe e permissões",
    intro: "Gerencie os acessos da equipe e as permissões por módulo.",
    icon: Users,
  },
  {
    id: "seguranca",
    label: "Acesso e segurança",
    description: "Proteções da conta",
    title: "Acesso e segurança",
    intro: "Confira o nível de acesso aplicado ao seu perfil.",
    icon: ShieldCheck,
  },
  {
    id: "notificacoes",
    label: "Notificações",
    description: "Avisos do sistema",
    title: "Notificações",
    intro: "Entenda como os avisos do Infinity Law são organizados.",
    icon: Bell,
  },
  {
    id: "aparencia",
    label: "Aparência",
    description: "Identidade do sistema",
    title: "Aparência do sistema",
    intro: "A identidade visual padrão do escritório em um só lugar.",
    icon: Palette,
  },
];

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-stone-100 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="text-xs text-stone-400">{label}</dt>
      <dd className="break-all text-sm font-semibold text-stone-700 sm:text-right">{value}</dd>
    </div>
  );
}

export function ConfiguracoesWorkspace({
  profile,
  usuarios,
  cargos,
  currentUserId,
  canWrite,
}: {
  profile: { name: string; email: string; role: string; active: boolean; isAdmin: boolean };
  usuarios: Usuario[];
  cargos: Cargo[];
  currentUserId: string;
  canWrite: boolean;
}) {
  const [activeSection, setActiveSection] = useState<SectionId>("escritorio");
  const shouldReduceMotion = useReducedMotion();
  const active = sections.find((section) => section.id === activeSection) ?? sections[0]!;
  const panelTransition = { duration: shouldReduceMotion ? 0 : 0.2, ease: "easeOut" as const };

  return (
    <div className="space-y-5">
      <div className="grid items-start gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <nav aria-label="Seções de configurações" className="rounded-2xl border border-stone-200/80 bg-white p-2.5 shadow-[0_8px_24px_-20px_rgba(23,25,26,.4)]">
          <p className="px-3 pb-2 pt-2 text-[10px] font-bold uppercase tracking-[.14em] text-stone-400">Preferências</p>
          <div className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {sections.map((section) => {
              const selected = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "group relative flex min-w-[172px] flex-1 items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 lg:min-w-0 lg:flex-none",
                    selected ? "bg-gold-soft text-gold-dark" : "text-stone-600 hover:bg-stone-50 hover:text-[#17191a]",
                  )}
                >
                  {selected && <motion.span layoutId="settings-active-indicator" className="absolute inset-0 rounded-xl border border-gold/15" transition={panelTransition} />}
                  <span className={cn("relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors", selected ? "bg-white text-gold-dark shadow-sm" : "bg-stone-50 text-stone-400 group-hover:bg-white group-hover:text-stone-600")}>
                    <section.icon aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <span className="relative min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold">{section.label}</span>
                    <span className={cn("mt-0.5 block truncate text-[10px]", selected ? "text-gold-dark/65" : "text-stone-400")}>{section.description}</span>
                  </span>
                  {selected && <ChevronRight aria-hidden="true" className="relative hidden h-3.5 w-3.5 shrink-0 lg:block" />}
                </button>
              );
            })}
          </div>
        </nav>

        <AnimatePresence mode="wait" initial={false}>
          <motion.section
            key={activeSection}
            initial={shouldReduceMotion ? false : { opacity: 0, y: 7 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, y: -5 }}
            transition={panelTransition}
            aria-labelledby="settings-section-title"
            className="min-h-[440px] rounded-2xl border border-stone-200/80 bg-white p-5 shadow-[0_8px_24px_-20px_rgba(23,25,26,.4)] sm:p-6"
          >
            <div className="mb-5 flex items-start gap-3 border-b border-stone-100 pb-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-soft text-gold-dark">
                <active.icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[.15em] text-gold-dark">Configurações do escritório</p>
                <h2 id="settings-section-title" className="mt-1 text-base font-black text-[#17191a]">{active.title}</h2>
                <p className="mt-1 text-xs leading-relaxed text-stone-500">{active.intro}</p>
              </div>
            </div>

            {activeSection === "escritorio" && (
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                <section className="rounded-xl border border-stone-100 bg-[#fdfdfc] px-4 py-2 sm:px-5">
                  <div className="flex items-center gap-3 py-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#17191a] text-xs font-black text-gold">
                      {profile.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#17191a]">{profile.name}</p>
                      <p className="truncate text-[11px] text-stone-400">{profile.role}</p>
                    </div>
                  </div>
                  <dl><InfoRow label="Nome" value={profile.name} /><InfoRow label="E-mail" value={profile.email} /><InfoRow label="Cargo" value={profile.role} /></dl>
                </section>
                <aside className="rounded-xl bg-stone-50 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-stone-700"><CircleUserRound className="h-4 w-4 text-gold-dark" />Conta autenticada</div>
                  <p className="mt-2 text-[11px] leading-relaxed text-stone-500">Os dados exibidos vêm do seu perfil cadastrado no escritório. Para manter o controle de acesso, alterações de cargo são feitas pela gestão da equipe.</p>
                  <div className="mt-4 flex items-center gap-2 rounded-lg border border-stone-200/80 bg-white px-3 py-2 text-[10px] font-semibold text-stone-600">
                    <span className={cn("h-2 w-2 rounded-full", profile.active ? "bg-emerald-500" : "bg-stone-300")} />
                    {profile.active ? "Conta ativa" : "Conta inativa"}
                  </div>
                </aside>
              </div>
            )}

            {activeSection === "equipe" && (
              <UsuariosPanel usuarios={usuarios} cargos={cargos} currentUserId={currentUserId} canWrite={canWrite} />
            )}

            {activeSection === "seguranca" && (
              <div className="grid gap-3 md:grid-cols-2">
                <section className="rounded-xl border border-stone-100 bg-[#fdfdfc] p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#17191a]"><LockKeyhole className="h-4 w-4 text-gold-dark" />Seu nível de acesso</div>
                  <dl className="mt-3"><InfoRow label="Perfil" value={profile.role} /><InfoRow label="Conta" value={profile.active ? "Ativa" : "Inativa"} /><InfoRow label="Gestão de acessos" value={canWrite ? "Permitida" : "Somente leitura"} /></dl>
                </section>
                <section className="rounded-xl border border-gold/15 bg-gold-soft/45 p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-xs font-bold text-gold-dark"><ShieldCheck className="h-4 w-4" />Proteção por perfil</div>
                  <p className="mt-3 text-[11px] leading-relaxed text-stone-600">As permissões são verificadas no servidor em cada operação. Contas administrativas e o próprio perfil não podem ser rebaixados ou alterados por esta tela.</p>
                  {profile.isAdmin && <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-gold/20 bg-white/70 px-2.5 py-1.5 text-[10px] font-bold text-gold-dark"><Check className="h-3 w-3" />Perfil administrador</span>}
                </section>
              </div>
            )}

            {activeSection === "notificacoes" && (
              <div className="max-w-2xl rounded-xl border border-stone-100 bg-[#fdfdfc] p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-soft text-gold-dark"><Bell className="h-4 w-4" /></span>
                  <div><h3 className="text-xs font-bold text-[#17191a]">Preferências por módulo</h3><p className="mt-1.5 text-xs leading-relaxed text-stone-500">Os avisos relacionados aos registros ficam junto das áreas correspondentes, como agenda, processos e comunicação. Esta tela não altera preferências individuais de notificação.</p></div>
                </div>
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-white px-3 py-2.5 text-[10px] text-stone-500"><Bell className="h-3.5 w-3.5 text-gold-dark" />Nenhuma preferência individual é alterada nesta área.</div>
              </div>
            )}

            {activeSection === "aparencia" && (
              <div className="max-w-2xl">
                <p className="mb-4 text-xs leading-relaxed text-stone-500">A identidade visual do Infinity Law mantém o mesmo padrão em todas as áreas, com contraste consistente e destaque dourado para ações importantes.</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "Grafite", value: "#17191A", className: "bg-[#17191a]" },
                    { label: "Dourado", value: "#D4AF37", className: "bg-[#D4AF37]" },
                    { label: "Marfim", value: "#FDFDFC", className: "border border-stone-200 bg-[#fdfdfc]" },
                  ].map((color) => (
                    <div key={color.label} className="rounded-xl border border-stone-100 bg-white p-3.5">
                      <span className={cn("block h-14 rounded-lg", color.className)} />
                      <p className="mt-3 text-xs font-bold text-stone-700">{color.label}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-stone-400">{color.value}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 flex items-center gap-2 text-[10px] text-stone-400"><Palette className="h-3.5 w-3.5 text-gold-dark" />A paleta é compartilhada pelo sistema e não pode ser alterada nesta tela.</p>
              </div>
            )}
          </motion.section>
        </AnimatePresence>
      </div>
    </div>
  );
}
