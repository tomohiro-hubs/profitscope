/**
 * 前年比差分率(%)を算出する。
 * 計算式: (当年値 - 前年値) / 前年値 × 100
 * 前年値が 0 の場合は null を返す。
 */
export function calculateYearOverYear(current: number, previous: number): number | null {
  if (previous === 0) {
    return null;
  }

  return ((current - previous) / previous) * 100;
}
