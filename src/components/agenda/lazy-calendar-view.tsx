"use client";

import dynamic from "next/dynamic";

export const CalendarView = dynamic(
  () => import("./calendar-view").then((m) => m.CalendarView),
  {
    ssr: false,
    loading: () => <div className="h-[720px] animate-pulse rounded-2xl bg-muted/40" aria-hidden="true" />,
  }
);
