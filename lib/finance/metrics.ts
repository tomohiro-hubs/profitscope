import type { KpiMetrics, ProfitAndLossSummary, RoiProfitType, RoiResult } from "@/types";

/**
 * ROI 計算で利用する利益金額を取得する。
 */
function getProfitValue(summary: ProfitAndLossSummary, profitType: RoiProfitType): number {
  switch (profitType) {
    case "operatingIncome":
      return summary.operatingIncome;
    case "ordinaryIncome":
      return summary.ordinaryIncome;
    case "netIncome":
      return summary.netIncome;
    default: {
      const exhaustiveCheck: never = profitType;
      return exhaustiveCheck;
    }
  }
}

/**
 * 分母を使った割合(%)を算出する。
 * 分母が 0 の場合は null を返す。
 */
function calculatePercentage(numerator: number, denominator: number): number | null {
  if (denominator === 0) {
    return null;
  }

  return (numerator / denominator) * 100;
}

/**
 * ROI を算出する。
 * 投下資本が 0 の場合は null を返す。
 */
export function calculateRoi(
  summary: ProfitAndLossSummary,
  investedCapital: number,
  profitType: RoiProfitType
): RoiResult {
  const profitValue = getProfitValue(summary, profitType);

  return {
    profitType,
    profitValue,
    investedCapital,
    roi: calculatePercentage(profitValue, investedCapital),
  };
}

/**
 * 損益サマリーから KPI 一式を算出する。
 * 売上高または投下資本が 0 の場合、該当比率は null を返す。
 */
export function calculateKpis(
  summary: ProfitAndLossSummary,
  roiProfitType: RoiProfitType,
  investedCapital: number
): KpiMetrics {
  return {
    grossProfitMargin: calculatePercentage(summary.grossProfit, summary.revenue),
    operatingMargin: calculatePercentage(summary.operatingIncome, summary.revenue),
    ordinaryMargin: calculatePercentage(summary.ordinaryIncome, summary.revenue),
    netMargin: calculatePercentage(summary.netIncome, summary.revenue),
    costRatio: calculatePercentage(summary.totalCost, summary.revenue),
    roi: calculateRoi(summary, investedCapital, roiProfitType).roi,
  };
}
