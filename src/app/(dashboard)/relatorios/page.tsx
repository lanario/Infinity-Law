import { Header } from "@/components/layout/header";
import { RelatoriosPanel } from "@/components/relatorios/relatorios-panel";
import type { Metadata } from "next";
import { getCurrentProfile } from "@/lib/server/current-profile";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Relatórios" };

export default async function RelatoriosPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.can("relatorios", "read")) redirect("/dashboard");
  return (
    <div className="min-h-full flex flex-col bg-[#fcfcfb] dark:bg-[#101213]">
      <Header title="Relatórios" />
      <main className="flex-1 w-full px-3 py-4 sm:px-6 sm:py-6 lg:px-8 2xl:px-10 pb-20 sm:pb-12 space-y-5">
        <RelatoriosPanel />
      </main>
    </div>
  );
}
