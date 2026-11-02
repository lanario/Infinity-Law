import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { PerfilWorkspace } from "@/components/perfil/perfil-workspace";

export const metadata: Metadata = { title: "Meu perfil" };

export default function PerfilPage() {
  return (
    <div className="min-h-full flex flex-col bg-[#fcfcfb] dark:bg-[#101213]">
      <Header title="Meu perfil" />
      <main className="flex-1 w-full px-3 py-4 sm:px-6 sm:py-6 lg:px-8 2xl:px-10 pb-20 sm:pb-12 space-y-5">
        <PerfilWorkspace />
      </main>
    </div>
  );
}
