"use client";

import type { ProfitAndLossSummary } from "@/types";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ProfitWaterfallChartProps {
  summary: ProfitAndLossSummary;
}

interface WaterfallDataItem {
  name: string;
  base: number;
  delta: number;
  color: string;
  value: number;
}

const POSITIVE_COLOR = "#16a34a";
const NEGATIVE_COLOR = "#dc2626";
const TOTAL_COLOR = "#2563eb";

const formatCurrency = (value: number): string => `¥${value.toLocaleString("ja-JP")}`;

export function ProfitWaterfallChart({ summary }: ProfitWaterfallChartProps): React.JSX.Element {
  const items = [
    { name: "売上高", value: summary.revenue, isTotal: true },
    { name: "売上原価", value: -summary.cogs, isTotal: false },
    { name: "販管費", value: -summary.sga, isTotal: false },
    {
      name: "営業外損益",
      value: summary.nonOperatingIncome - summary.nonOperatingExpense,
      isTotal: false,
    },
    {
      name: "特別損益",
      value: summary.extraordinaryGain - summary.extraordinaryLoss,
      isTotal: false,
    },
    { name: "法人税等", value: -summary.tax, isTotal: false },
    { name: "当期純利益", value: summary.netIncome, isTotal: true },
  ].map((item) => ({ ...item, value: Math.trunc(item.value) }));

  let running = 0;
  const data: WaterfallDataItem[] = items.map((item) => {
    if (item.isTotal) {
      const totalValue = item.value;
      const start = Math.min(0, totalValue);
      const delta = Math.abs(totalValue);
      running = totalValue;
      return {
        name: item.name,
        base: start,
        delta,
        color: TOTAL_COLOR,
        value: totalValue,
      };
    }

    const next = running + item.value;
    const base = item.value >= 0 ? running : next;
    const delta = Math.abs(item.value);
    running = next;

    return {
      name: item.name,
      base,
      delta,
      color: item.value >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR,
      value: item.value,
    };
  });

  return (
    <div className="h-[420px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 16, right: 36, left: 24, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" tickFormatter={formatCurrency} />
          <YAxis type="category" dataKey="name" width={110} />
          <Tooltip
            formatter={(_, __, payload) => formatCurrency((payload?.payload as WaterfallDataItem).value)}
            labelFormatter={(label) => `${label}`}
          />
          <Bar dataKey="base" stackId="waterfall" fill="transparent" isAnimationActive={false} />
          <Bar dataKey="delta" stackId="waterfall" radius={[0, 4, 4, 0]}>
            {data.map((item) => (
              <Cell key={item.name} fill={item.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
