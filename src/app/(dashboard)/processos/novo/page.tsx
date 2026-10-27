import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/server/current-profile";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Header } from "@/components/layout/header";
import { NovoProcessoPageContent } from "@/components/processos/novo-processo-page-content";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Novo Processo" };

export default async function NovoProcessoPage() {
  const profile = await getCurrentProfile().catch((error) => {
    console.error("[NovoProcessoPage] Falha ao carregar perfil:", error);
    return "error" as const;
  });
  if (profile === "error") {
    return (
      <div>
        <Header title="Novo Processo" />
        <div className="p-4 sm:p-6"><QueryErrorState retryHref="/processos/novo" /></div>
      </div>
    );
  }
  if (!profile) redirect("/login");
  if (!profile.can("processos", "write")) redirect(profile.can("processos", "read") ? "/processos" : "/dashboard");

  return (
    <>
      <Header title="Novo Processo" />
      <NovoProcessoPageContent isIntercepted={false} />
    </>
  );
}
