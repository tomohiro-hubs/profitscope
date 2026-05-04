import type {
  AccountCategory,
  AccountItem,
  CategoryTotals,
  FinancialStatement,
  Money,
  ProfitAndLossSummary,
} from "@/types";

const ACCOUNT_CATEGORIES: AccountCategory[] = [
  "revenue",
  "cogs",
  "sga",
  "nonOpIncome",
  "nonOpExpense",
  "extraordinaryGain",
  "extraordinaryLoss",
  "tax",
  "exclude",
];

const EMPTY_CATEGORY_TOTALS: CategoryTotals = {
  revenue: 0,
  cogs: 0,
  sga: 0,
  nonOpIncome: 0,
  nonOpExpense: 0,
  extraordinaryGain: 0,
  extraordinaryLoss: 0,
  tax: 0,
  exclude: 0,
};

const toSafeInteger = (value: unknown): Money => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value);
};

/**
 * 勘定科目配列をカテゴリ別に集計する。
 * 不正値・欠損値は 0 円として扱う。
 */
export const buildCategoryTotals = (items: AccountItem[]): CategoryTotals => {
  const totals: CategoryTotals = { ...EMPTY_CATEGORY_TOTALS };

  for (const item of items) {
    if (!ACCOUNT_CATEGORIES.includes(item.category)) {
      continue;
    }

    totals[item.category] = Math.round(
      totals[item.category] + toSafeInteger(item.amount),
    );
  }

  return totals;
};

/**
 * 年次財務データから損益計算サマリーを算出する。
 * 会計計算順序は売上→売上原価→売上総利益→販管費→営業利益→営業外→経常→特別→税引前→税→当期純利益に従う。
 */
export const calculateProfitAndLoss = (
  statement: FinancialStatement,
): ProfitAndLossSummary => {
  const totals = buildCategoryTotals(statement.items);

  const revenue = toSafeInteger(totals.revenue);
  const cogs = toSafeInteger(totals.cogs);
  const grossProfit = Math.round(revenue - cogs);

  const sga = toSafeInteger(totals.sga);
  const operatingIncome = Math.round(grossProfit - sga);

  const nonOperatingIncome = toSafeInteger(totals.nonOpIncome);
  const nonOperatingExpense = toSafeInteger(totals.nonOpExpense);
  const ordinaryIncome = Math.round(
    operatingIncome + nonOperatingIncome - nonOperatingExpense,
  );

  const extraordinaryGain = toSafeInteger(totals.extraordinaryGain);
  const extraordinaryLoss = toSafeInteger(totals.extraordinaryLoss);
  const pretaxIncome = Math.round(
    ordinaryIncome + extraordinaryGain - extraordinaryLoss,
  );

  const tax = toSafeInteger(totals.tax);
  const netIncome = Math.round(pretaxIncome - tax);

  const totalCost = Math.round(
    cogs + sga + nonOperatingExpense + extraordinaryLoss + tax,
  );

  return {
    revenue,
    cogs,
    grossProfit,
    sga,
    operatingIncome,
    nonOperatingIncome,
    nonOperatingExpense,
    ordinaryIncome,
    extraordinaryGain,
    extraordinaryLoss,
    pretaxIncome,
    tax,
    netIncome,
    totalCost,
  };
};
