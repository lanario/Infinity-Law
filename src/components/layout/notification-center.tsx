"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { Bell, BellRing, BriefcaseBusiness, CalendarClock, CheckCheck, Clock3, ExternalLink, FileText, LoaderCircle, RefreshCw } from "lucide-react";
import { useUser } from "@/components/layout/user-context";
import { cn } from "@/lib/utils";

const READ_IDS_KEY = "infinity-law:notifications-read:v1";

type NotificationItem = {
  id: string;
  kind: "agenda" | "intimacao" | "processo";
  title: string;
  description: string;
  date: string;
  href: string;
};

type PanelPosition = {
  left: number;
  top: number;
  maxHeight: number;
  contentMaxHeight: number;
};

const PANEL_VIEWPORT_MARGIN = 12;
const PANEL_GAP = 12;

const CACHE_TTL_MS = 60_000;
// Cache e requisição compartilhados entre montagens do Header; chaveados por usuário.
let cache: { userId: string; at: number; items: NotificationItem[] } | null = null;
let inflight: { userId: string; promise: Promise<NotificationItem[]> } | null = null;

// userId nulo (usuário ainda desconhecido): busca sem cache nem requisição compartilhada, para não misturar contas.
function fetchNotifications(userId: string | null, force: boolean): Promise<NotificationItem[]> {
  if (userId && !force && cache?.userId === userId && Date.now() - cache.at < CACHE_TTL_MS) return Promise.resolve(cache.items);
  if (userId && inflight?.userId === userId) return inflight.promise;
  const promise = (async () => {
    const response = await fetch("/api/notificacoes", { cache: "no-store" });
    const result = await response.json().catch(() => null);
    if (!response.ok || !Array.isArray(result?.notifications)) {
      throw new Error(result?.error || "Não foi possível carregar as notificações.");
    }
    const items = result.notifications as NotificationItem[];
    if (userId) cache = { userId, at: Date.now(), items };
    return items;
  })();
  if (!userId) return promise;
  const tracked = promise.finally(() => {
    if (inflight?.promise === tracked) inflight = null;
  });
  inflight = { userId, promise: tracked };
  return tracked;
}

function dateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function readStoredIds(storageKey: string) {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]");
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return new Set<string>();
  }
}

export function NotificationCenter() {
  const user = useUser();
  const storageKey = `${READ_IDS_KEY}:${user?.id ?? "anonymous"}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const panelHeaderRef = useRef<HTMLDivElement>(null);
  const panelFooterRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null);
  const userId = user?.id ?? null;
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => (userId && cache?.userId === userId ? cache.items : []));
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(() => !(userId && cache?.userId === userId));
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      setNotifications(await fetchNotifications(userId, force));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar as notificações.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    setReadIds(readStoredIds(storageKey));
  }, [storageKey]);

  // Busca inicial (contador de não lidas) fora do caminho crítico; usa cache de 60s.
  useEffect(() => {
    const id = window.setTimeout(() => void loadNotifications(), 1500);
    return () => window.clearTimeout(id);
  }, [loadNotifications]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target) &&
        !panelRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setPanelPosition(null);
      return;
    }

    function updatePanelPosition() {
      const trigger = triggerRef.current;
      const panel = panelRef.current;
      if (!trigger || !panel) return;

      const triggerRect = trigger.getBoundingClientRect();
      const top = triggerRect.bottom + PANEL_GAP;
      const availableHeight = Math.max(0, window.innerHeight - top - PANEL_VIEWPORT_MARGIN);
      const panelWidth = panel.offsetWidth;
      const left = Math.max(
        PANEL_VIEWPORT_MARGIN,
        Math.min(
          triggerRect.right - panelWidth,
          window.innerWidth - panelWidth - PANEL_VIEWPORT_MARGIN,
        ),
      );
      const panelChromeHeight =
        (panelHeaderRef.current?.offsetHeight ?? 0) +
        (panelFooterRef.current?.offsetHeight ?? 0) +
        2;
      const contentMaxHeight = Math.max(
        0,
        Math.min(window.innerHeight * 0.65, 520, availableHeight - panelChromeHeight),
      );

      setPanelPosition((current) => {
        const next = { left, top, maxHeight: availableHeight, contentMaxHeight };
        if (
          current?.left === next.left &&
          current.top === next.top &&
          current.maxHeight === next.maxHeight &&
          current.contentMaxHeight === next.contentMaxHeight
        ) {
          return current;
        }
        return next;
      });
    }

    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);

    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updatePanelPosition);
    [triggerRef.current, panelRef.current, panelHeaderRef.current, panelFooterRef.current].forEach((element) => {
      if (element) resizeObserver?.observe(element);
    });

    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
      resizeObserver?.disconnect();
    };
  }, [open]);

  const unreadCount = notifications.reduce((count, item) => count + (readIds.has(item.id) ? 0 : 1), 0);
  const hasAgendaNotifications = notifications.some((item) => item.kind === "agenda");
  const onlyProcessNotifications = notifications.length > 0 && notifications.every((item) => item.kind === "processo");
  const footerHref = onlyProcessNotifications ? "/processos" : hasAgendaNotifications ? "/agenda" : "/intimacoes";
  const footerLabel = onlyProcessNotifications ? "Abrir processos" : hasAgendaNotifications ? "Abrir agenda" : "Abrir intimações";

  function markRead(id: string) {
    const next = new Set(readIds);
    next.add(id);
    const retainedIds = Array.from(next).slice(-200);
    setReadIds(new Set(retainedIds));
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(retainedIds));
    } catch {
      // O painel continua funcional se o navegador bloquear o armazenamento local.
    }
  }

  function markAllRead() {
    const next = new Set([...readIds, ...notifications.map((item) => item.id)]);
    const retainedIds = Array.from(next).slice(-200);
    setReadIds(new Set(retainedIds));
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(retainedIds));
    } catch {
      // O painel continua funcional se o navegador bloquear o armazenamento local.
    }
  }

  function toggleOpen() {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) void loadNotifications();
  }

  return (
    <div ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        className={cn(
          "group relative flex h-10 w-10 items-center justify-center rounded-2xl border bg-white/75 shadow-[0_8px_20px_-18px_rgba(23,25,26,0.7)] transition-[transform,background-color,border-color,color] duration-150 hover:-translate-y-0.5 hover:bg-gold-soft focus:outline-none focus:ring-2 focus:ring-gold/25 dark:bg-zinc-900/80 dark:hover:bg-gold/15",
          open
            ? "border-gold/50 text-gold-dark dark:text-[#E5C158]"
            : "border-stone-200 text-stone-500 hover:border-gold/50 hover:text-gold-dark dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-gold/50 dark:hover:text-[#E5C158]",
        )}
        aria-label={unreadCount ? `Notificações, ${unreadCount} não lida${unreadCount === 1 ? "" : "s"}` : "Notificações"}
        aria-expanded={open}
        aria-controls="infinity-notifications-panel"
        aria-haspopup="dialog"
      >
        <Bell className={cn("h-[18px] w-[18px] transition-transform duration-150 group-hover:rotate-[-8deg]", open && "rotate-[-8deg]")} aria-hidden="true" />
        {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-[#fcfcfb] bg-gold px-1 text-[9px] font-black leading-none text-[#17191a] dark:border-zinc-900">{unreadCount > 99 ? "99+" : unreadCount}</span>}
        {!loading && notifications.length === 0 && <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full border border-white bg-emerald-500 dark:border-zinc-900" aria-hidden="true" />}
      </button>

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {open && (
            <motion.section
              key="notification-panel"
              ref={panelRef}
              id="infinity-notifications-panel"
              role="dialog"
              aria-label="Central de notificações"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.985 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              style={{
                left: panelPosition?.left ?? 0,
                top: panelPosition?.top ?? 0,
                maxHeight: panelPosition ? `${panelPosition.maxHeight}px` : undefined,
                visibility: panelPosition ? "visible" : "hidden",
              }}
              className="dashboard-root fixed z-[60] w-[min(410px,calc(100vw-1.5rem))] origin-top-right overflow-hidden rounded-2xl border border-stone-200/90 bg-[#fcfcfb] shadow-[0_24px_70px_-25px_rgba(23,25,26,0.35)] dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div ref={panelHeaderRef} className="flex items-center justify-between gap-3 border-b border-stone-100 bg-white/90 px-4 py-3.5 dark:border-zinc-800 dark:bg-zinc-900/90">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-soft text-gold-dark dark:bg-gold/15 dark:text-[#E5C158]"><BellRing className="h-4 w-4" aria-hidden="true" /></span>
                <div><h2 className="text-sm font-black text-[#17191a] dark:text-zinc-100">Notificações</h2><p className="mt-0.5 text-[10px] text-stone-400 dark:text-zinc-400">Agenda, processos e publicações recentes</p></div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {unreadCount > 0 && <button type="button" onClick={markAllRead} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[10px] font-bold text-gold-dark transition hover:bg-gold-soft dark:text-[#E5C158] dark:hover:bg-gold/15" title="Marcar todas como lidas"><CheckCheck className="h-3.5 w-3.5" aria-hidden="true" /><span className="hidden sm:inline">Marcar lidas</span></button>}
                <button type="button" onClick={() => void loadNotifications(true)} disabled={loading} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100" aria-label="Atualizar notificações" title="Atualizar notificações"><RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} aria-hidden="true" /></button>
              </div>
            </div>

              <div
                style={{ maxHeight: panelPosition ? `${panelPosition.contentMaxHeight}px` : undefined }}
                className="overflow-y-auto overscroll-contain"
              >
              {loading && notifications.length === 0 ? (
                <div className="flex flex-col items-center px-6 py-12 text-center"><LoaderCircle className="h-6 w-6 animate-spin text-gold-dark dark:text-[#E5C158]" aria-hidden="true" /><p className="mt-3 text-xs font-semibold text-stone-600 dark:text-zinc-400">Buscando atualizações…</p></div>
              ) : error && notifications.length === 0 ? (
                <div className="px-5 py-10 text-center"><p role="alert" className="text-xs leading-relaxed text-red-700 dark:text-red-400">{error}</p><button type="button" onClick={() => void loadNotifications(true)} className="mt-3 rounded-lg bg-gold-soft px-3 py-2 text-[10px] font-bold text-gold-dark transition hover:bg-gold/20 dark:bg-gold/15 dark:text-[#E5C158]">Tentar novamente</button></div>
              ) : notifications.length === 0 ? (
                <div className="px-5 py-11 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"><CheckCheck className="h-5 w-5" aria-hidden="true" /></span><p className="mt-3 text-xs font-bold text-stone-700 dark:text-zinc-200">Tudo em dia</p><p className="mt-1 text-[10px] text-stone-400 dark:text-zinc-400">Sem prazos, movimentações ou publicações recentes.</p></div>
              ) : (
                <ul className="divide-y divide-stone-100 dark:divide-zinc-800">
                  {notifications.map((item) => {
                    const isRead = readIds.has(item.id);
                    const Icon = item.kind === "agenda" ? CalendarClock : item.kind === "processo" ? BriefcaseBusiness : FileText;
                    const iconStyle = item.kind === "agenda"
                      ? "bg-gold-soft text-gold-dark dark:bg-gold/15 dark:text-[#E5C158]"
                      : item.kind === "processo"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                        : "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400";
                    return (
                      <li key={item.id}>
                        <Link href={item.href} onClick={() => { markRead(item.id); setOpen(false); }} className={cn("group flex gap-3 px-4 py-3.5 transition hover:bg-gold-soft/25 dark:hover:bg-zinc-800/70", !isRead && "bg-gold-soft/10 dark:bg-gold/[0.06]")}>
                          <span className={cn("relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", iconStyle)}><Icon className="h-4 w-4" aria-hidden="true" />{!isRead && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-white bg-gold dark:border-zinc-900" aria-label="Não lida" />}</span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-start justify-between gap-2"><span className="line-clamp-2 text-xs font-bold leading-relaxed text-stone-800 dark:text-zinc-100">{item.title}</span><ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-stone-300 transition group-hover:text-gold-dark dark:text-zinc-600 dark:group-hover:text-[#E5C158]" aria-hidden="true" /></span>
                            <span className="mt-1 block line-clamp-2 text-[10px] leading-relaxed text-stone-500 dark:text-zinc-400">{item.description}</span>
                            <span className="mt-1.5 flex items-center gap-1 text-[9px] font-semibold text-stone-400 dark:text-zinc-500"><Clock3 className="h-3 w-3" aria-hidden="true" />{dateLabel(item.date)}</span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
              </div>

              {notifications.length > 0 && <div ref={panelFooterRef} className="flex items-center justify-between border-t border-stone-100 bg-white/80 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/80"><span className="text-[9px] text-stone-400 dark:text-zinc-500">{notifications.length} {notifications.length === 1 ? "atualização" : "atualizações"}</span><Link href={footerHref} onClick={() => setOpen(false)} className="text-[10px] font-bold text-gold-dark transition hover:text-gold dark:text-[#E5C158]">{footerLabel}</Link></div>}
            </motion.section>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
