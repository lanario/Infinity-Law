import { createClient } from "@/lib/supabase/server";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export async function DeadlinesList() {
  const supabase = createClient();

  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: eventos } = await supabase
    .from("eventos")
    .select(`
      id,
      titulo,
      inicio,
      tipo,
      processo_id,
      processos (numero_cnj, tribunal)
    `)
    .eq("tipo", "prazo")
    .gte("inicio", now.toISOString())
    .lte("inicio", sevenDaysFromNow)
    .order("inicio", { ascending: true })
    .limit(8);

  const prazos = eventos ?? [];

  function getBadge(inicio: string) {
    const diff = new Date(inicio).getTime() - now.getTime();
    const hours = diff / (1000 * 60 * 60);
    if (hours < 48) return { label: "Urgente", class: "bg-red-50 text-red-600 border-red-200" };
    if (hours < 72) return { label: "Atenção", class: "bg-amber-50 text-amber-700 border-amber-200" };
    return { label: "Em dia", class: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-4 w-4 text-gold" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-gray-900">Prazos Próximos (7 dias)</h2>
      </div>

      {prazos.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">
          Nenhum prazo nos próximos 7 dias
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="table">
            <caption className="sr-only">Lista de prazos processuais dos próximos 7 dias</caption>
            <thead>
              <tr className="border-b border-gray-50">
                <th scope="col" className="text-left py-2 text-xs text-gray-400 font-medium">Prazo</th>
                <th scope="col" className="text-left py-2 text-xs text-gray-400 font-medium hidden sm:table-cell">Processo</th>
                <th scope="col" className="text-left py-2 text-xs text-gray-400 font-medium">Vence</th>
                <th scope="col" className="text-left py-2 text-xs text-gray-400 font-medium">Status</th>
                <th scope="col" className="w-4"></th>
              </tr>
            </thead>
            <tbody>
              {prazos.map((evento) => {
                const badge = getBadge(evento.inicio);
                const processo = Array.isArray(evento.processos)
                  ? evento.processos[0]
                  : evento.processos;
                return (
                  <tr key={evento.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="py-3 pr-4">
                      <p className="text-xs font-medium text-gray-800 truncate max-w-[180px]">
                        {evento.titulo}
                      </p>
                    </td>
                    <td className="py-3 pr-4 hidden sm:table-cell">
                      {processo ? (
                        <p className="text-xs text-gray-500 font-mono truncate max-w-[160px]">
                          {processo.numero_cnj}
                        </p>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <p className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(evento.inicio), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={cn(
                          "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                          badge.class
                        )}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-3">
                      {evento.processo_id && (
                        <Link
                          href={`/processos/${evento.processo_id}`}
                          aria-label={`Ver processo do prazo ${evento.titulo}`}
                          className="text-gray-300 hover:text-gray-500"
                        >
                          <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
