"use client";

import * as React from "react";
import { Select } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatusFilterOption {
  value: string;
  label: string;
  count?: number;
  colorDot?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface StatusFilterSelectProps {
  value: string;
  options: StatusFilterOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
  triggerClassName?: string;
  popupClassName?: string;
  align?: "start" | "end" | "center";
  labelPrefix?: string;
  disabled?: boolean;
}

export function StatusFilterSelect({
  value,
  options,
  onChange,
  ariaLabel = "Filtrar por status",
  className,
  triggerClassName,
  popupClassName,
  align = "end",
  labelPrefix,
  disabled = false,
}: StatusFilterSelectProps) {
  const selectedOption = React.useMemo(
    () => options.find((opt) => opt.value === value) ?? options[0],
    [options, value]
  );

  return (
    <Select.Root
      modal={false}
      value={value}
      onValueChange={(val) => {
        if (val !== null && val !== undefined && val !== value) {
          onChange(val);
        }
      }}
      disabled={disabled || options.length === 0}
    >
      <Select.Trigger
        aria-label={ariaLabel}
        className={cn(
          "group inline-flex h-10 min-w-[130px] items-center justify-between gap-2.5 rounded-xl border border-stone-200 bg-stone-50/70 px-3 text-xs font-bold text-[#17191a] shadow-xs outline-none transition duration-150 hover:border-stone-300 hover:bg-white focus-visible:border-gold/70 focus-visible:ring-4 focus-visible:ring-gold/10 data-[popup-open]:border-gold/70 data-[popup-open]:bg-white disabled:cursor-not-allowed disabled:opacity-60",
          triggerClassName,
          className
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          {labelPrefix && (
            <span className="shrink-0 text-[11px] font-semibold text-stone-400">
              {labelPrefix}
            </span>
          )}
          {selectedOption?.colorDot ? (
            <span
              className={cn("h-2 w-2 shrink-0 rounded-full", selectedOption.colorDot)}
              aria-hidden="true"
            />
          ) : selectedOption?.icon ? (
            <selectedOption.icon className="h-3.5 w-3.5 shrink-0 text-stone-400" />
          ) : null}
          <span className="truncate">{selectedOption?.label ?? value}</span>
          {selectedOption?.count !== undefined && (
            <span className="rounded-md bg-stone-200/70 px-1.5 py-0.5 text-[10px] font-semibold text-stone-600 tabular-nums">
              {selectedOption.count}
            </span>
          )}
        </div>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-stone-400 transition-transform duration-200 group-data-[popup-open]:rotate-180"
          aria-hidden="true"
        />
      </Select.Trigger>

      <Select.Portal>
        <Select.Positioner
          side="bottom"
          align={align}
          sideOffset={6}
          alignItemWithTrigger={false}
          className="z-50"
        >
          <Select.Popup
            className={cn(
              "z-50 min-w-[180px] max-w-[280px] overflow-hidden rounded-xl border border-stone-200 bg-white p-1 shadow-xl shadow-stone-900/10 outline-none animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2",
              popupClassName
            )}
          >
            <Select.List className="max-h-48 overflow-y-auto overscroll-contain py-0.5">
              {options.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-stone-700 outline-none transition select-none",
                    "data-[highlighted]:bg-gold-soft/70 data-[highlighted]:text-[#17191a]",
                    "data-[selected]:bg-gold-soft/70 data-[selected]:font-bold data-[selected]:text-[#17191a]"
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {option.colorDot ? (
                      <span
                        className={cn("h-2 w-2 shrink-0 rounded-full", option.colorDot)}
                        aria-hidden="true"
                      />
                    ) : option.icon ? (
                      <option.icon className="h-3.5 w-3.5 shrink-0 text-stone-400" />
                    ) : null}
                    <Select.ItemText className="truncate">
                      {option.label}
                    </Select.ItemText>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 ml-2">
                    {option.count !== undefined && (
                      <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-stone-500 tabular-nums">
                        {option.count}
                      </span>
                    )}
                    <Select.ItemIndicator>
                      <Check className="h-3.5 w-3.5 text-gold-dark" aria-hidden="true" />
                    </Select.ItemIndicator>
                  </div>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
