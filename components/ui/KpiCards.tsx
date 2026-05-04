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
  grossProfitMargin: "売上高に対する売上総利益の割合です。",
  operatingMargin: "売上高に対する営業利益の割合です。",
  ordinaryMargin: "売上高に対する経常利益の割合です。",
  netMargin: "売上高に対する当期純利益の割合です。",
  costRatio: "売上高に対する総費用の割合です。",
  roi: "投下資本に対する利益の割合です。",
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
