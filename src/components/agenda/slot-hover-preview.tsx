import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";

export const SLOT_STEP_MINUTES = 30;

export function formatSlotTime(minute: number) {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

// Minuto inicial do slot sob o ponteiro, alinhado à grade e nunca além do último slot.
export function snapMinuteFromOffset(offset: number, size: number, startMinute: number, endMinute: number) {
  if (size <= 0) return startMinute;
  const clamped = Math.max(0, Math.min(size - 1, offset));
  const slot = Math.floor(((clamped / size) * (endMinute - startMinute)) / SLOT_STEP_MINUTES);
  return Math.min(endMinute - SLOT_STEP_MINUTES, startMinute + slot * SLOT_STEP_MINUTES);
}

// Conteúdo do preview: ícone + horário e, fora do modo compacto, a dica de clique.
export function SlotPreviewBody({ minute, compact }: { minute: number; compact?: boolean }) {
  return (
    <>
      <span className="inline-flex items-center gap-1 text-[11px] font-extrabold tabular-nums leading-4">
        <CalendarClock className="h-3 w-3 shrink-0" aria-hidden="true" />{formatSlotTime(minute)}
      </span>
      {!compact && <span className="max-w-full truncate px-1 text-[9px] font-medium leading-3 text-stone-600 dark:text-zinc-300">Clique para criar um agendamento</span>}
    </>
  );
}

// Bloco flutuante (somente ponteiro): o chamador define posição/tamanho via style.
export function SlotPreview({ minute, compact, className, style }: { minute: number; compact?: boolean; className?: string; style: React.CSSProperties }) {
  return (
    <div aria-hidden="true" style={style} className={cn("pointer-events-none absolute z-[5] flex flex-col items-center justify-center overflow-hidden rounded-md border border-gold/50 bg-gold/15 text-gold-dark dark:text-gold", className)}>
      <SlotPreviewBody minute={minute} compact={compact} />
    </div>
  );
}
