"use client";

import { MODULES, ACTIONS, MODULE_LABELS, ACTION_LABELS } from "@/lib/permissions";
import type { PermissionsMap } from "@/types/permissions";
import { cn } from "@/lib/utils";

interface PermissionMatrixProps {
  permissoes: PermissionsMap;
  onChange?: (permissoes: PermissionsMap) => void;
  readonly?: boolean;
}

export function PermissionMatrix({
  permissoes,
  onChange,
  readonly = false,
}: PermissionMatrixProps) {
  function toggle(modulo: string, acao: string) {
    if (readonly || !onChange) return;
    const current = (permissoes as Record<string, Record<string, boolean>>)[modulo]?.[acao] ?? false;
    const updated: PermissionsMap = {
      ...permissoes,
      [modulo]: {
        ...(permissoes as Record<string, Record<string, boolean>>)[modulo],
        [acao]: !current,
      },
    };
    onChange(updated);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs" role="table">
        <caption className="sr-only">Matriz de permissões por módulo e ação</caption>
        <thead>
          <tr className="border-b border-gray-100 dark:border-zinc-800">
            <th scope="col" className="py-2 pr-4 text-left font-medium text-gray-500 dark:text-zinc-400">Módulo</th>
            {ACTIONS.map((action) => (
              <th
                key={action}
                scope="col"
                className="px-3 py-2 text-center font-medium text-gray-500 dark:text-zinc-400"
              >
                {ACTION_LABELS[action]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MODULES.map((modulo) => (
            <tr key={modulo} className="border-b border-gray-50 last:border-0 dark:border-zinc-800/70 dark:hover:bg-zinc-800/60">
              <td className="py-2.5 pr-4 font-medium text-gray-700 dark:text-zinc-100">{MODULE_LABELS[modulo]}</td>
              {ACTIONS.map((acao) => {
                const isChecked =
                  (permissoes as Record<string, Record<string, boolean>>)[modulo]?.[acao] ?? false;
                return (
                  <td key={acao} className="py-2.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggle(modulo, acao)}
                      disabled={readonly}
                      aria-label={`${MODULE_LABELS[modulo]} — ${ACTION_LABELS[acao]}`}
                      className={cn(
                        "h-4 w-4 rounded border-gray-200 dark:border-zinc-700 dark:bg-zinc-900",
                        "accent-[#D4AF37]",
                        readonly ? "cursor-default" : "cursor-pointer"
                      )}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
