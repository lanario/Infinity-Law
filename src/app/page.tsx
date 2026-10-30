import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: { absolute: "Infinity Law — Gestão jurídica para escritórios de advocacia" },
  description:
    "Processos sincronizados com DataJud e DJEN, agenda da equipe, financeiro, comunicação e relatórios em um só sistema para escritórios de advocacia.",
};

export default function RootPage() {
  return <LandingPage />;
}
