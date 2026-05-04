import React from "react";
import type { ProfitAndLossSummary } from "@/types";

export interface SummaryCardsProps {
  summary: ProfitAndLossSummary;
}

const formatCurrency = (value: number | null | undefined): string => {
  if (value == null || Number.isNaN(value)) {
    return "-";
  }

  return `¥${new Intl.NumberFormat("ja-JP").format(value)}`;
};

/** 損益サマリーをカード表示する。 */
export function SummaryCards({ summary }: SummaryCardsProps): React.JSX.Element {
  const cards = [
    { label: "売上高", value: summary.revenue },
    { label: "総費用", value: summary.totalCost },
    { label: "売上総利益", value: summary.grossProfit },
    { label: "営業利益", value: summary.operatingIncome },
    { label: "経常利益", value: summary.ordinaryIncome },
    { label: "税引前当期純利益", value: summary.pretaxIncome },
    { label: "当期純利益", value: summary.netIncome },
  ];

  return (
    <section aria-label="損益サマリー" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const isNegative = (card.value ?? 0) < 0;

        return (
          <article key={card.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className={`mt-1 text-xl font-semibold ${isNegative ? "text-rose-600" : "text-slate-900"}`}>
              {formatCurrency(card.value)}
            </p>
          </article>
        );
      })}
    </section>
  );
}
