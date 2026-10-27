import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/server/current-profile";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { NovoProcessoPageContent } from "@/components/processos/novo-processo-page-content";

export default async function NovoProcessoModalPage() {
  const profile = await getCurrentProfile().catch((error) => {
    console.error("[NovoProcessoModalPage] Falha ao carregar perfil:", error);
    return "error" as const;
  });
  if (profile === "error") return <QueryErrorState retryHref="/processos/novo" />;
  if (!profile) redirect("/login");
  if (!profile.can("processos", "write")) redirect(profile.can("processos", "read") ? "/processos" : "/dashboard");

  return <NovoProcessoPageContent isIntercepted />;
}
