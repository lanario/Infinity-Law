"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
  autoComplete?: string;
  includeTime?: boolean;
  className?: string;
  labelClassName?: string;
  inputClassName?: string;
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
});
const fullDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "full",
});
const weekDays = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];

function parseLocalDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3])
  ) return null;

  return date;
}

function toLocalDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseTypedDate(value: string) {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return parseLocalDate(trimmed);
  const digitsOnly = /^\d{8}$/.test(trimmed);
  const match = digitsOnly
    ? [trimmed, trimmed.slice(0, 2), trimmed.slice(2, 4), trimmed.slice(4)]
    : /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/.exec(trimmed);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(0);
  date.setHours(0, 0, 0, 0);
  date.setFullYear(year, month - 1, day);
  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) return null;

  return date;
}

function getCalendarDays(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDayOffset = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const numberOfDays = new Date(year, monthIndex + 1, 0).getDate();
  const cellCount = Math.ceil((firstDayOffset + numberOfDays) / 7) * 7;

  return Array.from({ length: cellCount }, (_, index) => {
    const day = index - firstDayOffset + 1;
    return day < 1 || day > numberOfDays ? null : new Date(year, monthIndex, day);
  });
}

function getToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function DatePicker({
  value,
  onChange,
  label,
  required = false,
  disabled = false,
  min,
  max,
  autoComplete,
  includeTime = false,
  className,
  labelClassName,
  inputClassName,
}: DatePickerProps) {
  const id = useId();
  const reduceMotion = useReducedMotion();
  const triggerRef = useRef<HTMLInputElement>(null);
  const calendarButtonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const dayButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const selectedDate = parseLocalDate(value);
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(() => selectedDate ? dateFormatter.format(selectedDate) : "");
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const initial = selectedDate ?? getToday();
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });
  const [position, setPosition] = useState({ top: 0, left: 0, width: 320 });
  const calendarDays = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);
  const dateValue = selectedDate ? toLocalDateValue(selectedDate) : "";
  const todayValue = toLocalDateValue(getToday());
  const timeValue = includeTime ? /T(\d{2}:\d{2})/.exec(value)?.[1] ?? "" : "";
  const minDate = min ? parseLocalDate(min) : null;
  const maxDate = max ? parseLocalDate(max) : null;
  const minDateValue = minDate ? toLocalDateValue(minDate) : "";
  const maxDateValue = maxDate ? toLocalDateValue(maxDate) : "";
  const canChooseToday = (!minDateValue || todayValue >= minDateValue)
    && (!maxDateValue || todayValue <= maxDateValue);

  useEffect(() => {
    const currentDate = parseLocalDate(value);
    setInputValue(currentDate ? dateFormatter.format(currentDate) : "");
    triggerRef.current?.setCustomValidity("");
  }, [value]);

  useEffect(() => {
    const currentDate = parseLocalDate(value);
    if (!currentDate) return;
    setVisibleMonth(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
  }, [value]);

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const viewportPadding = 12;
      const width = Math.min(Math.max(rect.width, 320), window.innerWidth - viewportPadding * 2);
      const left = Math.min(
        Math.max(viewportPadding, rect.left),
        window.innerWidth - width - viewportPadding,
      );
      const estimatedHeight = 420;
      const roomBelow = window.innerHeight - rect.bottom;
      const top = roomBelow >= estimatedHeight + 8
        ? rect.bottom + 8
        : Math.max(viewportPadding, rect.top - estimatedHeight - 8);

      setPosition({ top, left, width });
    }

    function closeOnOutsideClick(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (
        !popoverRef.current?.contains(target)
        && !triggerRef.current?.contains(target)
        && !calendarButtonRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }

    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const focusDate = dateValue || todayValue;
    const selectedButton = dayButtonRefs.current.get(focusDate);
    selectedButton?.focus({ preventScroll: true });
  }, [open, visibleMonth, dateValue, todayValue]);

  function openCalendar() {
    if (disabled) return;
    setOpen(true);
  }

  function handleDateInputChange(input: HTMLInputElement, nextValue: string) {
    setInputValue(nextValue);
    const trimmed = nextValue.trim();

    if (!trimmed) {
      input.setCustomValidity("");
      if (!required) onChange("");
      return;
    }

    const date = parseTypedDate(trimmed);
    if (!date) {
      input.setCustomValidity("Digite uma data válida no formato dd/mm/aaaa.");
      return;
    }

    const nextDate = toLocalDateValue(date);
    if (minDateValue && nextDate < minDateValue) {
      input.setCustomValidity(`A data deve ser igual ou posterior a ${dateFormatter.format(minDate!)}.`);
      return;
    }
    if (maxDateValue && nextDate > maxDateValue) {
      input.setCustomValidity(`A data deve ser igual ou anterior a ${dateFormatter.format(maxDate!)}.`);
      return;
    }

    input.setCustomValidity("");
    setInputValue(dateFormatter.format(date));
    onChange(includeTime ? `${nextDate}T${timeValue || "09:00"}` : nextDate);
  }

  function selectDate(date: Date) {
    const nextDate = toLocalDateValue(date);
    if (minDateValue && nextDate < minDateValue) return;
    if (maxDateValue && nextDate > maxDateValue) return;

    if (includeTime) {
      onChange(`${nextDate}T${timeValue || "09:00"}`);
    } else {
      onChange(nextDate);
    }
    triggerRef.current?.setCustomValidity("");
    setInputValue(dateFormatter.format(date));
    setOpen(false);
    triggerRef.current?.focus();
  }

  function moveFocus(date: Date) {
    const isoDate = toLocalDateValue(date);
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    window.requestAnimationFrame(() => dayButtonRefs.current.get(isoDate)?.focus());
  }

  function handleDayKeyDown(event: KeyboardEvent<HTMLButtonElement>, date: Date) {
    const offsets: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    const offset = offsets[event.key];
    if (offset === undefined) return;

    event.preventDefault();
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + offset);
    moveFocus(nextDate);
  }

  function updateTime(time: string) {
    if (!dateValue) return;
    if (!time && !required) {
      onChange("");
      return;
    }
    onChange(`${dateValue}T${time}`);
  }

  const popover = typeof document !== "undefined" ? createPortal(
    <AnimatePresence>
      {open && <motion.div
        ref={popoverRef}
        id={`${id}-calendar`}
        role="dialog"
        aria-label="Escolher data"
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 7, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 5, scale: 0.99 }}
        transition={{ duration: reduceMotion ? 0.12 : 0.18, ease: "easeOut" }}
        style={{ top: position.top, left: position.left, width: position.width }}
        className="fixed z-[100] max-h-[calc(100vh-24px)] overflow-y-auto rounded-2xl border border-stone-200 bg-white shadow-[0_20px_55px_-22px_rgba(23,25,26,0.42)]"
      >
        <div className="flex items-center justify-between border-b border-stone-100 bg-[#fbf6e9]/80 px-3 py-2.5">
          <button
            type="button"
            onClick={() => setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-stone-500 transition hover:bg-white hover:text-[#17191a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <p aria-live="polite" className="text-sm font-extrabold capitalize text-[#17191a]">
            {monthFormatter.format(visibleMonth)} {visibleMonth.getFullYear()}
          </p>
          <button
            type="button"
            onClick={() => setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-stone-500 transition hover:bg-white hover:text-[#17191a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-7 border-b border-stone-100 px-2 py-2 text-center">
          {weekDays.map((day) => (
            <span key={day} className="py-1 text-[10px] font-extrabold tracking-wide text-stone-400">{day}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1 px-2 py-2">
          {calendarDays.map((date, index) => {
            if (!date) return <span key={`empty-${index}`} aria-hidden="true" className="h-10" />;

            const isoDate = toLocalDateValue(date);
            const isSelected = isoDate === dateValue;
            const isToday = isoDate === todayValue;
            const outsideRange = (minDateValue && isoDate < minDateValue) || (maxDateValue && isoDate > maxDateValue);

            return (
              <button
                key={isoDate}
                ref={(element) => {
                  if (element) dayButtonRefs.current.set(isoDate, element);
                  else dayButtonRefs.current.delete(isoDate);
                }}
                type="button"
                disabled={Boolean(outsideRange)}
                onClick={() => selectDate(date)}
                onKeyDown={(event) => handleDayKeyDown(event, date)}
                aria-label={fullDateFormatter.format(date)}
                aria-pressed={isSelected}
                aria-current={isToday ? "date" : undefined}
                className={cn(
                  "relative mx-auto flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
                  isSelected
                    ? "bg-gold text-[#17191a] shadow-[0_4px_12px_-6px_rgba(138,107,18,0.7)]"
                    : "text-stone-700 hover:bg-[#fbf6e9] hover:text-gold-dark",
                  isToday && !isSelected && "ring-1 ring-inset ring-gold/80 text-gold-dark",
                  outsideRange && "cursor-not-allowed text-stone-300 hover:bg-transparent hover:text-stone-300",
                )}
              >
                {date.getDate()}
                {isToday && <span className={cn("absolute bottom-1 h-1 w-1 rounded-full", isSelected ? "bg-[#17191a]" : "bg-gold-dark")} aria-hidden="true" />}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-stone-100 px-4 py-2.5">
          {!required ? (
            <button
              type="button"
              onClick={() => {
                onChange("");
                triggerRef.current?.setCustomValidity("");
                setInputValue("");
                setOpen(false);
                triggerRef.current?.focus();
              }}
              disabled={!value}
              className="rounded-lg px-2 py-1 text-xs font-bold text-stone-500 transition hover:bg-stone-50 hover:text-[#17191a] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Limpar
            </button>
          ) : <span />}
          <button
            type="button"
            onClick={() => selectDate(getToday())}
            disabled={!canChooseToday}
            className="rounded-lg px-2 py-1 text-xs font-extrabold text-gold-dark transition hover:bg-[#fbf6e9] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Hoje
          </button>
        </div>
      </motion.div>}
    </AnimatePresence>,
    document.body,
  ) : null;

  return (
    <div className={cn("w-full min-w-0", className)}>
      {label && (
        <label htmlFor={`${id}-input`} className={cn("mb-1.5 block text-xs font-semibold text-stone-600", labelClassName)}>
          {label}{required && <span className="ml-1 text-gold-dark" aria-hidden="true">*</span>}
        </label>
      )}
      <div className="flex min-w-0 gap-2">
        <div className="relative min-w-0 flex-1">
          <input
            ref={triggerRef}
            id={`${id}-input`}
            type="text"
            maxLength={10}
            inputMode="numeric"
            autoComplete={autoComplete}
            required={required}
            disabled={disabled}
            value={inputValue}
            placeholder="dd/mm/aaaa"
            onChange={(event) => handleDateInputChange(event.currentTarget, event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                openCalendar();
              }
            }}
            aria-describedby={`${id}-date-hint`}
            className={cn(
              "h-11 w-full rounded-xl border border-stone-200 bg-white pl-10 pr-11 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 hover:border-stone-300 focus:border-gold focus:ring-4 focus:ring-gold/15 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:opacity-60",
              inputClassName,
            )}
          />
          <button
            ref={calendarButtonRef}
            type="button"
            onClick={() => open ? setOpen(false) : openCalendar()}
            disabled={disabled}
            aria-label={open ? "Fechar calendário" : "Abrir calendário"}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls={open ? `${id}-calendar` : undefined}
            className="absolute left-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-gold-dark transition hover:bg-[#fbf6e9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <span id={`${id}-date-hint`} className="sr-only">Digite a data no formato dia/mês/ano ou escolha no calendário.</span>

        {includeTime && (
          <label className="relative flex h-11 w-[7.5rem] shrink-0 items-center">
            <Clock3 className="pointer-events-none absolute left-3 h-4 w-4 text-gold-dark" aria-hidden="true" />
            <input
              type="time"
              required={required}
              disabled={disabled || !dateValue}
              value={timeValue}
              min={minDateValue === dateValue ? min?.slice(11, 16) : undefined}
              onChange={(event) => updateTime(event.target.value)}
              aria-label={label ? `Horário de ${label.toLocaleLowerCase("pt-BR")}` : "Horário"}
              className="h-full w-full rounded-xl border border-stone-200 bg-white pl-9 pr-2 text-sm text-stone-800 outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/15 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:opacity-60"
            />
          </label>
        )}
      </div>
      {popover}
    </div>
  );
}
