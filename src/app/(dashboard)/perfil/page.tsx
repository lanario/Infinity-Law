import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { PerfilWorkspace } from "@/components/perfil/perfil-workspace";

export const metadata: Metadata = { title: "Meu perfil" };

export default function PerfilPage() {
  return (
    <div>
      <Header title="Meu perfil" />
      <div className="p-4 sm:p-6">
        <PerfilWorkspace />
      </div>
    </div>
  );
}
