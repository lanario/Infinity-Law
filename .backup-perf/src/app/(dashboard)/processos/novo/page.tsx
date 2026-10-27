import { Header } from "@/components/layout/header";
import { NovoProcessoPageContent } from "@/components/processos/novo-processo-page-content";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Novo Processo" };

export default function NovoProcessoPage() {
  return (
    <>
      <Header title="Novo Processo" />
      <NovoProcessoPageContent isIntercepted={false} />
    </>
  );
}
