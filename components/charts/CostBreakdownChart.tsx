"use client";

import type { AccountCategory, AccountItem, ProfitAndLossSummary } from "@/types";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";

interface CostBreakdownChartProps {
  summary: ProfitAndLossSummary;
  items: AccountItem[];
  mode: "category" | "item";
}

interface CostDataItem {
  name: string;
  value: number;
}

const COST_COLORS = ["#3b82f6", "#0ea5e9", "#f59e0b", "#ef4444", "#8b5cf6"];
const MAX_ITEM_SLICES = 8;
const MIN_LABEL_PERCENT = 0.5;
const COST_TARGET_CATEGORIES: AccountCategory[] = ["cogs", "sga", "nonOpExpense", "extraordinaryLoss", "tax"];
const CATEGORY_LABELS: Partial<Record<AccountCategory, string>> = {
  cogs: "売上原価",
  sga: "販管費",
  nonOpExpense: "営業外費用",
  extraordinaryLoss: "特別損失",
  tax: "法人税等",
};

const formatCurrency = (value: number): string => `¥${value.toLocaleString("ja-JP")}`;
const shouldShowLabel = (percent?: number): boolean => {
  const ratio = typeof percent === "number" ? percent * 100 : 0;
  return ratio >= MIN_LABEL_PERCENT;
};

const renderPieLabel = (props: PieLabelRenderProps): React.JSX.Element | null => {
  const { percent, x = 0, y = 0, value = 0, cx = 0 } = props;
  const centerX = typeof cx === "number" ? cx : 0;
  if (!shouldShowLabel(percent)) {
    return null;
  }

  return (
    <text
      x={x}
      y={y}
      fill="#2563eb"
      textAnchor={x >= centerX ? "end" : "start"}
      dominantBaseline="central"
      fontSize={12}
      fontWeight={600}
    >
      {Math.trunc(Number(value)).toLocaleString("ja-JP")}
    </text>
  );
};

function buildCategoryData(summary: ProfitAndLossSummary): CostDataItem[] {
  return [
    { name: "売上原価", value: summary.cogs },
    { name: "販管費", value: summary.sga },
    { name: "営業外費用", value: summary.nonOperatingExpense },
    { name: "特別損失", value: summary.extraordinaryLoss },
    { name: "法人税等", value: summary.tax },
  ].map((item) => ({ ...item, value: Math.max(0, Math.trunc(item.value)) }));
}

function buildItemData(items: AccountItem[]): CostDataItem[] {
  const aggregated = new Map<string, number>();

  for (const item of items) {
    if (!COST_TARGET_CATEGORIES.includes(item.category)) {
      continue;
    }
    const amount = Math.max(0, Math.trunc(item.amount));
    if (amount <= 0) {
      continue;
    }
    const label = `${CATEGORY_LABELS[item.category] ?? item.category}: ${item.name}`;
    aggregated.set(label, Math.round((aggregated.get(label) ?? 0) + amount));
  }

  const sorted = Array.from(aggregated.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  if (sorted.length <= MAX_ITEM_SLICES) {
    return sorted;
  }

  const visible = sorted.slice(0, MAX_ITEM_SLICES);
  const othersTotal = sorted.slice(MAX_ITEM_SLICES).reduce((total, item) => total + item.value, 0);
  if (othersTotal > 0) {
    visible.push({ name: "その他", value: othersTotal });
  }

  return visible;
}

export function CostBreakdownChart({ summary, items, mode }: CostBreakdownChartProps): React.JSX.Element {
  const data: CostDataItem[] = mode === "item" ? buildItemData(items) : buildCategoryData(summary);
  const showSliceLabel = mode === "category";

  const hasData = data.some((item) => item.value > 0);

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={hasData ? data : [{ name: "データなし", value: 1 }]}
            dataKey="value"
            nameKey="name"
            cx={showSliceLabel ? "44%" : "50%"}
            cy="50%"
            outerRadius={showSliceLabel ? "68%" : "75%"}
            label={hasData && showSliceLabel ? renderPieLabel : false}
            labelLine={false}
            minAngle={2}
          >
            {(hasData ? data : [{ name: "データなし", value: 1 }]).map((entry, index) => (
              <Cell key={`${entry.name}-${index}`} fill={hasData ? COST_COLORS[index % COST_COLORS.length] : "#d1d5db"} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => formatCurrency(value)} />
          <Legend
            verticalAlign="bottom"
            align="center"
            wrapperStyle={{ fontSize: "12px", lineHeight: "1.3" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
