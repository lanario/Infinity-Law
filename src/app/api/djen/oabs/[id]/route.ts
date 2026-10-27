import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeDjen } from "@/lib/djen/server-auth";
import { monitorIdSchema } from "@/lib/djen/validation";

const bodySchema = z.object({ ativo: z.boolean() });

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authorizeDjen("write");
  if (!auth.ok) return auth.response;

  if (!monitorIdSchema.safeParse(params.id).success) {
    return NextResponse.json({ error: "Monitoramento inválido." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Estado do monitoramento inválido." }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("djen_oab_monitoramentos")
      .update({ ativo: parsed.data.ativo })
      .eq("id", params.id)
      .eq("escritorio_id", auth.escritorioId)
      .select("id, numero_oab, uf_oab, ativo, ultima_sincronizacao_em")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: "Não foi possível atualizar o monitoramento." },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ error: "Monitoramento não encontrado." }, { status: 404 });
    }

    return NextResponse.json({ monitoramento: data });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível atualizar o monitoramento." },
      { status: 500 }
    );
  }
}
