import { ProcessoDetalhe } from "@/components/processos/processo-detalhe";

export const dynamic = "force-dynamic";

export default function ProcessoModalPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { criado?: string };
}) {
  return <ProcessoDetalhe params={params} searchParams={searchParams} embedded />;
}
