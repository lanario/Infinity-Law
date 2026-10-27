"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ClienteComProcessos } from "@/types/domain";

interface UseClientesOptions {
  initialData: ClienteComProcessos[];
}

export function useClientesRealtime({ initialData }: UseClientesOptions) {
  const [clientes, setClientes] = useState<ClienteComProcessos[]>(initialData);

  useEffect(() => {
    setClientes(initialData);
  }, [initialData]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("clientes-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "clientes" },
        (payload) => {
          setClientes((prev) => [
            payload.new as ClienteComProcessos,
            ...prev,
          ]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "clientes" },
        (payload) => {
          setClientes((prev) =>
            prev.map((c) =>
              c.id === (payload.new as ClienteComProcessos).id
                ? { ...c, ...(payload.new as ClienteComProcessos) }
                : c
            )
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "clientes" },
        (payload) => {
          setClientes((prev) =>
            prev.filter((c) => c.id !== (payload.old as { id: string }).id)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return clientes;
}
