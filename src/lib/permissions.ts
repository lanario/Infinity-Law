import type { Module, Action, PermissionsMap } from "@/types/permissions";

export { MODULES, ACTIONS } from "@/types/permissions";

export function checkPermission(
  permissoes: PermissionsMap,
  modulo: Module,
  acao: Action,
  isAdmin = false
): boolean {
  if (isAdmin) return true;
  return permissoes[modulo]?.[acao] ?? false;
}

export const MODULE_LABELS: Record<Module, string> = {
  dashboard: "Dashboard",
  clientes: "Clientes",
  processos: "Processos",
  financeiro: "Financeiro",
  agenda: "Agenda",
  comunicacao: "Comunicação",
  relatorios: "Relatórios",
  configuracoes: "Configurações",
};

export const ACTION_LABELS: Record<Action, string> = {
  read: "Visualizar",
  write: "Editar",
  delete: "Excluir",
};
