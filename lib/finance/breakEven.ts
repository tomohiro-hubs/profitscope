/**
 * 損益分岐点売上高の計算パラメータ。
 */
export interface BreakEvenRevenueParams {
  fixedCost: number;
  variableCostRatio: number;
}

/**
 * 損益分岐点売上高を算出する。
 * 計算式: 固定費 / (1 - 変動費率)
 * 分母が 0 以下の場合は null を返す。
 */
export function calculateBreakEvenRevenue(params: BreakEvenRevenueParams): number | null {
  const denominator = 1 - params.variableCostRatio;

  if (denominator <= 0) {
    return null;
  }

  return params.fixedCost / denominator;
}
