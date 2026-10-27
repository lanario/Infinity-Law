import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { WhatsAppComposer } from "@/components/comunicacao/whatsapp-composer";
import { TemplateManager } from "@/components/comunicacao/template-manager";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/server/current-profile";
import { MessageCircle, Clock3 } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Comunicação" };

export default async function ComunicacaoPage() {
  const supabase = createClient();

  const [profile, { data: clientes }, { data: templates }, { data: logs }] = await Promise.all([
    getCurrentProfile(),
    supabase
      .from("clientes")
      .select("id, nome, telefone")
      .eq("ativo", true)
      .order("nome")
      .limit(200),
    supabase
      .from("whatsapp_templates")
      .select("id, nome, categoria, corpo")
      .eq("ativo", true)
      .order("nome"),
    supabase
      .from("comunicacoes_log")
      .select("id, canal, destinatario, cliente_id, mensagem, status, enviado_em")
      .order("enviado_em", { ascending: false })
      .limit(40),
  ]);
  if (!profile) redirect("/login");
  if (!profile.can("comunicacao", "read")) redirect("/dashboard");
  const canWrite = profile.can("comunicacao", "write");

  const clienteIds = Array.from(new Set((logs ?? []).map((log) => log.cliente_id).filter((id): id is string => Boolean(id))));
  const { data: clientesDoHistorico } = clienteIds.length
    ? await supabase.from("clientes").select("id, nome").in("id", clienteIds)
    : { data: [] };
  const nomesClientes = new Map((clientesDoHistorico ?? []).map((cliente) => [cliente.id, cliente.nome]));

  return (
    <div>
      <Header title="Comunicação" />
      <div className="space-y-5 p-4 sm:p-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,.85fr)]">
          <section className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_8px_24px_-20px_rgba(23,25,26,.4)] sm:p-5">
            <div className="mb-4"><h2 className="text-sm font-black text-[#17191a]">Iniciar conversa</h2><p className="mt-1 text-xs text-stone-400">Prepare a mensagem e abra o WhatsApp com o contato selecionado.</p></div>
            {canWrite ? <WhatsAppComposer clientes={clientes ?? []} templates={templates ?? []} /> : <p className="rounded-xl bg-stone-50 p-4 text-xs text-stone-500">Seu perfil pode consultar a comunicação, mas não iniciar envios.</p>}
          </section>
          <TemplateManager initialTemplates={templates ?? []} canWrite={Boolean(canWrite)} />
        </div>

        <section className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_8px_24px_-20px_rgba(23,25,26,.4)]">
          <div className="flex items-center justify-between border-b border-stone-100 px-4 py-4 sm:px-5"><div><h2 className="text-sm font-black text-[#17191a]">Histórico recente</h2><p className="mt-1 text-xs text-stone-400">Registro de conversas iniciadas pelo escritório.</p></div><span className="inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-2.5 py-1 text-[10px] font-bold text-gold-dark"><Clock3 className="h-3 w-3" />{logs?.length ?? 0} registros</span></div>
          {logs?.length ? <div className="divide-y divide-stone-100">{logs.map((log) => <article key={log.id} className="flex items-start gap-3 px-4 py-3.5 sm:px-5"><span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold-soft text-gold-dark"><MessageCircle className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><h3 className="text-xs font-bold text-stone-800">{log.cliente_id ? nomesClientes.get(log.cliente_id) ?? log.destinatario : log.destinatario}</h3><span className="rounded-full bg-stone-100 px-2 py-0.5 text-[9px] font-bold uppercase text-stone-500">{log.status === "iniciado" ? "Conversa iniciada" : log.status}</span></div><p className="mt-1 line-clamp-2 whitespace-pre-wrap text-[11px] text-stone-500">{log.mensagem}</p><p className="mt-1.5 text-[10px] text-stone-400">{new Date(log.enviado_em).toLocaleString("pt-BR")} · {log.canal.toUpperCase()}</p></div></article>)}</div> : <div className="px-4 py-10 text-center"><MessageCircle className="mx-auto h-7 w-7 text-stone-300" /><p className="mt-2 text-xs font-semibold text-stone-600">Ainda sem conversas registradas</p><p className="mt-1 text-[11px] text-stone-400">As conversas iniciadas pelo painel aparecem aqui.</p></div>}
        </section>
      </div>
    </div>
  );
}
