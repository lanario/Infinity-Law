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
    <div>
      <Header title="Relatórios" />
      <div className="p-6">
        <RelatoriosPanel />
      </div>
    </div>
  );
}
