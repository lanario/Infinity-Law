import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BadgeCheck, Layers3, ShieldCheck } from "lucide-react";
import { Header } from "@/components/layout/header";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Planos" };

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  profissional: "Profissional",
  enterprise: "Enterprise",
};

export default async function PlanosPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("usuarios")
    .select("escritorio_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect("/login");

  const { data: office } = await supabase
    .from("escritorios")
    .select("plano")
    .eq("id", profile.escritorio_id)
    .maybeSingle();

  const plan = office?.plano ?? null;
  const planLabel = plan ? PLAN_LABELS[plan] ?? plan : "Não informado";

  return (
    <div>
      <Header title="Planos" />
      <div className="p-4 sm:p-6">
        <section className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-stone-200/80 bg-white shadow-[0_12px_36px_-24px_rgba(23,25,26,0.45)]">
          <div className="bg-gradient-to-br from-gold-soft/70 via-white to-white p-6 sm:p-9">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-soft text-gold-dark">
              <Layers3 className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="mt-6 text-[10px] font-black uppercase tracking-[0.16em] text-gold-dark">Assinatura do escritório</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-[#17191a]">Plano atual</h2>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="text-3xl font-black tracking-tight text-[#17191a]">{planLabel}</span>
              {plan && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                  <BadgeCheck className="h-4 w-4" aria-hidden="true" /> Ativo
                </span>
              )}
            </div>
          </div>
          <div className="border-t border-stone-100 p-6 sm:p-9">
            <div className="flex items-start gap-3 rounded-2xl border border-stone-100 bg-stone-50/80 p-4 sm:p-5">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold-dark" aria-hidden="true" />
              <div>
                <h3 className="text-sm font-bold text-[#17191a]">Plano vinculado à conta do escritório</h3>
                <p className="mt-1 text-xs leading-relaxed text-stone-500">
                  Esta tela consulta o plano cadastrado para o escritório. A alteração do plano não é feita por aqui.
                </p>
              </div>
            </div>
            <p className="mt-5 text-[11px] leading-relaxed text-stone-400">
              Os planos disponíveis no sistema são Starter, Profissional e Enterprise.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
