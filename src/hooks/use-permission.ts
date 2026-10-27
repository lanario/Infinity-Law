"use client";

import { useUser } from "@/components/layout/user-context";
import { checkPermission } from "@/lib/permissions";
import type { Module, Action } from "@/types/permissions";

// ⚠️ Este hook é apenas para UX (esconder/desabilitar na UI)
// Toda validação real de permissão DEVE ser feita no servidor
export function usePermission(modulo: Module, acao: Action): boolean {
  const user = useUser();
  if (!user) return false;
  return checkPermission(user.permissoes, modulo, acao, user.is_admin);
}

