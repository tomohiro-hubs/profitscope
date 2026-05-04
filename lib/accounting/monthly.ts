import type {
  AccountItem,
  FinancialStatement,
  MonthNumber,
  MonthlyAmount,
  MonthlyFinancialStatement,
  ProfitAndLossSummary,
} from "@/types";

import { calculateProfitAndLoss } from "./calculateProfit";

const MONTHS: MonthNumber[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const toSafeInteger = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value);
};

const sumMonthlyAmount = (
  monthlyAmounts: MonthlyAmount[],
  month: MonthNumber,
): number => {
  return monthlyAmounts.reduce((total, entry) => {
    if (entry.month !== month) {
      return total;
    }

    return Math.round(total + toSafeInteger(entry.amount));
  }, 0);
};

const buildMonthlyItems = (
  statement: MonthlyFinancialStatement,
  month: MonthNumber,
): AccountItem[] => {
  return statement.items.map((item) => {
    return {
      id: item.id,
      name: item.name,
      category: item.category,
      amount: sumMonthlyAmount(item.monthlyAmounts, month),
    };
  });
};

/**
 * 月次財務データを 1〜12 月の損益計算サマリーへ変換する。
 * 欠損値・不正値は 0 円として扱い、各月を独立した純粋計算で集計する。
 */
export const calculateMonthlyProfitAndLoss = (
  statement: MonthlyFinancialStatement,
): Array<{ month: MonthNumber; summary: ProfitAndLossSummary }> => {
  return MONTHS.map((month) => {
    const monthlyStatement: FinancialStatement = {
      fiscalYear: statement.fiscalYear,
      items: buildMonthlyItems(statement, month),
      investedCapital: toSafeInteger(statement.investedCapital),
    };

    return {
      month,
      summary: calculateProfitAndLoss(monthlyStatement),
    };
  });
};
