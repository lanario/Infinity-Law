"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProcessoSyncButton({
  processoId,
  numeroCNJ,
}: {
  processoId: string;
  numeroCNJ: string;
}) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sync() {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/cnj/consulta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numeroCNJ, processoId }),
      });
      await res.json();
      if (!res.ok) {
        setError("Não foi possível sincronizar. Tente novamente.");
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setError("Não foi possível sincronizar. Tente novamente.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <p role="alert" aria-atomic="true" className="text-xs text-red-500">
          {error}
        </p>
      )}
      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {syncing ? "Sincronização com DataJud em andamento." : ""}
      </span>
      <button
        onClick={sync}
        disabled={syncing}
        aria-busy={syncing}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors",
          "border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        <RefreshCw
          className={cn("h-3.5 w-3.5", syncing && "animate-spin")}
          aria-hidden="true"
        />
        {syncing ? "Sincronizando..." : "Sincronizar CNJ"}
      </button>
    </div>
  );
}
