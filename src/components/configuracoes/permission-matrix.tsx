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
          <tr className="border-b border-gray-100">
            <th scope="col" className="text-left py-2 pr-4 text-gray-500 font-medium">Módulo</th>
            {ACTIONS.map((action) => (
              <th
                key={action}
                scope="col"
                className="text-center py-2 px-3 text-gray-500 font-medium"
              >
                {ACTION_LABELS[action]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MODULES.map((modulo) => (
            <tr key={modulo} className="border-b border-gray-50 last:border-0">
              <td className="py-2.5 pr-4 text-gray-700 font-medium">{MODULE_LABELS[modulo]}</td>
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
                        "h-4 w-4 rounded border-gray-200",
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
