import React from "react";
import type { KpiMetrics } from "@/types";
import { MetricTooltip } from "./MetricTooltip";

export interface KpiCardsProps {
  metrics: KpiMetrics;
  descriptions?: Partial<Record<keyof KpiMetrics, string>>;
}

const KPI_LABELS: Record<keyof KpiMetrics, string> = {
  grossProfitMargin: "売上総利益率",
  operatingMargin: "営業利益率",
  ordinaryMargin: "経常利益率",
  netMargin: "当期純利益率",
  costRatio: "費用率",
  roi: "ROI",
};

const DEFAULT_DESCRIPTIONS: Record<keyof KpiMetrics, string> = {
  grossProfitMargin:
    "売上総利益率 = 売上総利益 ÷ 売上高 × 100。売上から原価を差し引いた後に、どれだけ粗利が残っているかを示します。数値が高いほど原価コントロールが効いています。",
  operatingMargin:
    "営業利益率 = 営業利益 ÷ 売上高 × 100。本業での稼ぐ力を表す指標です。販管費を含めた運営効率を確認できます。",
  ordinaryMargin:
    "経常利益率 = 経常利益 ÷ 売上高 × 100。営業損益に営業外収益・費用を加味した、通常活動ベースの利益率です。",
  netMargin:
    "当期純利益率 = 当期純利益 ÷ 売上高 × 100。税金等を反映した最終的な利益率で、手元に残る利益水準を確認できます。",
  costRatio:
    "費用率 = 総費用 ÷ 売上高 × 100。総費用は 売上原価 + 販管費 + 営業外費用 + 特別損失 + 法人税等 の合計です。低いほどコスト効率が高い状態です。",
  roi:
    "ROI(投下資本利益率) = 選択した利益（営業利益 / 経常利益 / 当期純利益）÷ 投下資本 × 100。投入した資本に対してどれだけ利益を生んだかを示します。",
};

const formatPercent = (value: number | null | undefined): string => {
  if (value == null || Number.isNaN(value)) {
    return "-";
  }

  return `${value.toFixed(1)}%`;
};

/** KPI をカード表示する。 */
export function KpiCards({ metrics, descriptions }: KpiCardsProps): React.JSX.Element {
  const entries = Object.entries(metrics) as Array<[keyof KpiMetrics, number | null]>;

  return (
    <section aria-label="KPI" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {entries.map(([key, value]) => {
        const label = KPI_LABELS[key];
        const description = descriptions?.[key] ?? DEFAULT_DESCRIPTIONS[key];

        return (
          <article key={key} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <p className="text-sm text-slate-500">{label}</p>
              <MetricTooltip title={label} description={description} />
            </div>
            <p className={`mt-1 text-xl font-semibold ${(value ?? 0) < 0 ? "text-rose-600" : "text-slate-900"}`}>
              {formatPercent(value)}
            </p>
          </article>
        );
      })}
    </section>
  );
}
