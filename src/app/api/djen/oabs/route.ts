import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeDjen } from "@/lib/djen/server-auth";
import { oabInputSchema } from "@/lib/djen/validation";

export async function POST(request: NextRequest) {
  const auth = await authorizeDjen("write");
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = oabInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados da OAB inválidos." },
      { status: 400 }
    );
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("djen_oab_monitoramentos")
      .upsert(
        {
          escritorio_id: auth.escritorioId,
          numero_oab: parsed.data.numeroOab,
          uf_oab: parsed.data.ufOab,
          ativo: true,
        },
        { onConflict: "escritorio_id,numero_oab_chave,uf_oab" }
      )
      .select("id, numero_oab, uf_oab, ativo, ultima_sincronizacao_em")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Não foi possível salvar o monitoramento da OAB." },
        { status: 500 }
      );
    }

    return NextResponse.json({ monitoramento: data });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível salvar o monitoramento da OAB." },
      { status: 500 }
    );
  }
}

export async function GET() {
  const auth = await authorizeDjen("read");
  if (!auth.ok) return auth.response;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("djen_oab_monitoramentos")
      .select("id, numero_oab, uf_oab, ativo, ultima_tentativa_em, ultima_sincronizacao_em")
      .eq("escritorio_id", auth.escritorioId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "Não foi possível carregar as OABs." }, { status: 500 });
    }

    return NextResponse.json({ monitoramentos: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar as OABs." }, { status: 500 });
  }
}
