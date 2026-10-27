"use client";

import dynamic from "next/dynamic";

// Altura fixa igual ao min-h dos cards, evita layout shift enquanto recharts carrega.
const ChartSkeleton = () => (
  <div className="h-full min-h-[380px] animate-pulse rounded-2xl bg-muted/40" aria-hidden="true" />
);

export const CourtTrendsChart = dynamic(
  () => import("./court-trends-chart").then((m) => m.CourtTrendsChart),
  { ssr: false, loading: ChartSkeleton }
);

export const AreasDistributionCard = dynamic(
  () => import("./areas-distribution-card").then((m) => m.AreasDistributionCard),
  { ssr: false, loading: ChartSkeleton }
);
