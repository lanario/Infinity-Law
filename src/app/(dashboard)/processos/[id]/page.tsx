import type { Metadata } from "next";
import { ProcessoDetalhe } from "@/components/processos/processo-detalhe";

interface PageProps {
  params: { id: string };
  searchParams?: { criado?: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return { title: `Processo ${params.id.slice(0, 8)}...` };
}

export default function ProcessoDetailPage({ params, searchParams }: PageProps) {
  return <ProcessoDetalhe params={params} searchParams={searchParams} />;
}
