import { createClient } from "@/lib/supabase/server";
import { NovoProcessoDialog } from "@/components/processos/novo-processo-dialog";

export async function NovoProcessoPageContent({
  isIntercepted,
}: {
  isIntercepted: boolean;
}) {
  const supabase = createClient();
  const [
    { data: { user } },
    { data: areas },
    { data: clientes },
    { data: responsaveis },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("areas_direito").select("id, nome").order("nome"),
    supabase.from("clientes").select("id, nome, tipo").eq("ativo", true).order("nome"),
    supabase.from("usuarios").select("id, nome").eq("ativo", true).order("nome"),
  ]);

  return (
    <NovoProcessoDialog
      areas={areas ?? []}
      clientes={clientes ?? []}
      responsaveis={responsaveis ?? []}
      currentUserId={user?.id ?? null}
      isIntercepted={isIntercepted}
    />
  );
}
