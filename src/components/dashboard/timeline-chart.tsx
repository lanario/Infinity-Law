"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { format, subDays, subMonths, eachDayOfInterval, eachWeekOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

type Period = "7d" | "30d" | "90d" | "1a";

// Mock data — será substituído por fetch real quando houver dados históricos
function generateMockData(period: Period) {
  const now = new Date();
  let dates: Date[] = [];

  switch (period) {
    case "7d":
      dates = eachDayOfInterval({ start: subDays(now, 6), end: now });
      return dates.map((d) => ({
        label: format(d, "dd/MM", { locale: ptBR }),
        clientes: Math.floor(Math.random() * 5),
        processos: Math.floor(Math.random() * 3),
      }));
    case "30d":
      dates = eachDayOfInterval({ start: subDays(now, 29), end: now });
      return dates.map((d) => ({
        label: format(d, "dd/MM", { locale: ptBR }),
        clientes: Math.floor(Math.random() * 4),
        processos: Math.floor(Math.random() * 3),
      }));
    case "90d":
      dates = eachWeekOfInterval({ start: subDays(now, 89), end: now });
      return dates.map((d) => ({
        label: format(d, "dd/MM", { locale: ptBR }),
        clientes: Math.floor(Math.random() * 15),
        processos: Math.floor(Math.random() * 10),
      }));
    case "1a":
      return Array.from({ length: 12 }, (_, i) => ({
        label: format(subMonths(now, 11 - i), "MMM/yy", { locale: ptBR }),
        clientes: Math.floor(Math.random() * 30),
        processos: Math.floor(Math.random() * 20),
      }));
  }
}

const PERIOD_LABELS: Record<Period, string> = {
  "7d": "7 dias",
  "30d": "30 dias",
  "90d": "90 dias",
  "1a": "1 ano",
};

export function TimelineChart() {
  const [period, setPeriod] = useState<Period>("30d");
  const data = generateMockData(period);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Crescimento do Escritório</h2>
          <p className="text-xs text-gray-400 mt-0.5">Novos clientes e processos</p>
        </div>
        <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                period === p
                  ? "bg-white text-gold-text shadow-sm border border-gray-100"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#9CA3AF" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9CA3AF" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                border: "1px solid #F0F0F0",
                borderRadius: 8,
                fontSize: 12,
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
              formatter={(value) =>
                value === "clientes" ? "Novos Clientes" : "Novos Processos"
              }
            />
            <Bar dataKey="clientes" fill="#FBF6E9" stroke="#D4AF37" strokeWidth={1} radius={[3, 3, 0, 0]} />
            <Line
              type="monotone"
              dataKey="processos"
              stroke="#D4AF37"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#D4AF37" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
