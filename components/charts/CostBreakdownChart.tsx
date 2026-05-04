"use client";

import type { ProfitAndLossSummary } from "@/types";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface CostBreakdownChartProps {
  summary: ProfitAndLossSummary;
}

interface CostDataItem {
  name: string;
  value: number;
}

const COST_COLORS = ["#3b82f6", "#0ea5e9", "#f59e0b", "#ef4444", "#8b5cf6"];

const formatCurrency = (value: number): string => `¥${value.toLocaleString("ja-JP")}`;

export function CostBreakdownChart({ summary }: CostBreakdownChartProps): React.JSX.Element {
  const data: CostDataItem[] = [
    { name: "売上原価", value: summary.cogs },
    { name: "販管費", value: summary.sga },
    { name: "営業外費用", value: summary.nonOperatingExpense },
    { name: "特別損失", value: summary.extraordinaryLoss },
    { name: "法人税等", value: summary.tax },
  ].map((item) => ({ ...item, value: Math.max(0, Math.trunc(item.value)) }));

  const hasData = data.some((item) => item.value > 0);

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={hasData ? data : [{ name: "データなし", value: 1 }]}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius="75%"
            label={hasData}
          >
            {(hasData ? data : [{ name: "データなし", value: 1 }]).map((entry, index) => (
              <Cell key={`${entry.name}-${index}`} fill={hasData ? COST_COLORS[index % COST_COLORS.length] : "#d1d5db"} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => formatCurrency(value)} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
