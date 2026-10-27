import { createClient } from "@/lib/supabase/server";
import { AlertTriangle, ExternalLink } from "lucide-react";
import Link from "next/link";

export async function AlertsPanel() {
  const supabase = createClient();

  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data: processos, error } = await supabase
    .from("processos")
    .select("id, numero_cnj, tribunal, ultima_sync_cnj")
    .eq("status", "ativo")
    .or(`ultima_sync_cnj.is.null,ultima_sync_cnj.lt.${fortyEightHoursAgo}`)
    .limit(5);

  const alertas = processos ?? [];

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm h-full">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-gray-900">Alertas CNJ</h2>
        {alertas.length > 0 && (
          <span className="ml-auto text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">
            {alertas.length}
          </span>
        )}
      </div>

      {error ? (
        <div role="alert" className="py-8 text-center">
          <p className="text-xs text-rose-600">Não foi possível consultar o status de sincronização.</p>
        </div>
      ) : alertas.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-xs text-gray-400">Não há processos que precisem de verificação agora.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {alertas.map((processo) => (
            <li key={processo.id}>
              <Link
                href={`/processos/${processo.id}`}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <span
                  className="mt-1 h-2 w-2 rounded-full bg-amber-400 flex-shrink-0 animate-pulse-amber"
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate font-mono">
                    {processo.numero_cnj ?? "CNJ ainda não informado"}
                  </p>
                  <p className="text-[10px] text-gray-400 truncate">
                    {processo.tribunal ?? "Tribunal não informado"}
                  </p>
                  <p className="text-[10px] text-amber-600">
                    {processo.ultima_sync_cnj
                      ? "Sem atualização há +48h"
                      : "Nunca sincronizado"}
                  </p>
                </div>
                <ExternalLink
                  className="h-3 w-3 text-gray-300 group-hover:text-gray-400 flex-shrink-0 mt-0.5"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
