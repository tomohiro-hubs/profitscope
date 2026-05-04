"use client";

import type { MonthlyCalculationResult } from "@/types";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface MonthlyTrendChartProps {
  monthly: MonthlyCalculationResult[];
}

interface MonthlyTrendDataItem {
  monthLabel: string;
  revenue: number;
  operatingIncome: number;
  netIncome: number;
}

const formatCurrency = (value: number): string => `¥${value.toLocaleString("ja-JP")}`;

export function MonthlyTrendChart({ monthly }: MonthlyTrendChartProps): React.JSX.Element {
  const data: MonthlyTrendDataItem[] = monthly
    .slice()
    .sort((a, b) => a.month - b.month)
    .map((item) => ({
      monthLabel: `${item.month}月`,
      revenue: Math.trunc(item.summary.revenue),
      operatingIncome: Math.trunc(item.summary.operatingIncome),
      netIncome: Math.trunc(item.summary.netIncome),
    }));

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="monthLabel" />
          <YAxis tickFormatter={formatCurrency} width={100} />
          <Tooltip formatter={(value: number) => formatCurrency(value)} />
          <Legend />
          <Line type="monotone" dataKey="revenue" name="売上" stroke="#2563eb" strokeWidth={2} dot={false} />
          <Line
            type="monotone"
            dataKey="operatingIncome"
            name="営業利益"
            stroke="#16a34a"
            strokeWidth={2}
            dot={false}
          />
          <Line type="monotone" dataKey="netIncome" name="当期純利益" stroke="#dc2626" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
