import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { LinkWhatsAppProvider } from "@/lib/whatsapp/LinkWhatsAppProvider";
import { sanitizePhoneE164 } from "@/lib/utils";
import { logAudit } from "@/lib/audit";

const bodySchema = z.object({
  clienteId: z.string().uuid(),
  telefone: z.string().min(8),
  mensagem: z.string().min(1).max(4096),
  templateId: z.string().uuid().optional(),
  processoId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  // Verifica permissão no banco (não só no front)
  const { data: hasPermission } = await supabase.rpc("has_permission", {
    modulo: "comunicacao",
    acao: "write",
  });

  if (!hasPermission) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { clienteId, telefone, mensagem, templateId, processoId } = parsed.data;
  const phoneE164 = sanitizePhoneE164(telefone);
  // Validações independentes (RLS limita cada uma ao escritório do usuário) + escritório em paralelo.
  const [{ data: cliente }, templateResult, processoResult, { data: escritorioData }] = await Promise.all([
    supabase
      .from("clientes")
      .select("id, telefone")
      .eq("id", clienteId)
      .eq("ativo", true)
      .maybeSingle(),
    templateId
      ? supabase.from("whatsapp_templates").select("id").eq("id", templateId).eq("ativo", true).maybeSingle()
      : Promise.resolve({ data: true }),
    processoId
      ? supabase.from("processos").select("id").eq("id", processoId).maybeSingle()
      : Promise.resolve({ data: true }),
    supabase.rpc("my_escritorio_id"),
  ]);
  if (!cliente || !cliente.telefone || sanitizePhoneE164(cliente.telefone) !== phoneE164) {
    return NextResponse.json({ error: "O telefone não corresponde a um cliente ativo deste escritório." }, { status: 400 });
  }
  if (!templateResult.data) return NextResponse.json({ error: "O modelo selecionado não está disponível." }, { status: 400 });
  if (!processoResult.data) return NextResponse.json({ error: "O processo selecionado não está disponível." }, { status: 400 });

  const provider = new LinkWhatsAppProvider();
  const result = await provider.send({ to: phoneE164, body: mensagem });

  if (!result.success) {
    return NextResponse.json({ error: "Falha ao gerar link" }, { status: 500 });
  }

  // A própria sessão autenticada pode gravar dentro dos limites de tenant/RLS.
  if (escritorioData) {
    const { error: logError } = await supabase.from("comunicacoes_log").insert({
        escritorio_id: escritorioData as string,
        canal: "whatsapp",
        destinatario: phoneE164,
        cliente_id: clienteId,
        processo_id: processoId ?? null,
        template_id: templateId ?? null,
        mensagem,
        status: "iniciado",
        enviado_por: user.id,
      });
    if (logError) {
      console.error("[whatsapp/send] Falha ao registrar a comunicação:", logError);
      return NextResponse.json({ error: "Não foi possível registrar a comunicação." }, { status: 500 });
    }
    await logAudit({
      escritorioId: escritorioData as string,
      usuarioId: user.id,
      tabela: "comunicacoes_log",
      acao: "insert",
      dadosNovos: { clienteId, canal: "whatsapp", status: "iniciado" },
    });
  }

  return NextResponse.json({ url: result.url });
}
