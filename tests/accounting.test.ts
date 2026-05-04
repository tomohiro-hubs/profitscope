import { describe, expect, it } from "vitest";
import { buildCategoryTotals, calculateProfitAndLoss } from "../lib/accounting/calculateProfit";
import type { AccountItem, FinancialStatement } from "../types";

const createStatement = (items: AccountItem[]): FinancialStatement => ({
  fiscalYear: 2026,
  items,
  investedCapital: 1_000_000,
});

describe("会計ロジック", () => {
  it("通常ケース(黒字)で会計順序どおりに損益計算できる", () => {
    const statement = createStatement([
      { id: "1", name: "売上高", category: "revenue", amount: 1_200_000 },
      { id: "2", name: "売上原価", category: "cogs", amount: 400_000 },
      { id: "3", name: "販管費", category: "sga", amount: 200_000 },
      { id: "4", name: "営業外収益", category: "nonOpIncome", amount: 50_000 },
      { id: "5", name: "営業外費用", category: "nonOpExpense", amount: 30_000 },
      { id: "6", name: "特別利益", category: "extraordinaryGain", amount: 20_000 },
      { id: "7", name: "特別損失", category: "extraordinaryLoss", amount: 10_000 },
      { id: "8", name: "法人税等", category: "tax", amount: 100_000 },
    ]);

    const result = calculateProfitAndLoss(statement);

    expect(result.revenue).toBe(1_200_000);
    expect(result.grossProfit).toBe(800_000);
    expect(result.operatingIncome).toBe(600_000);
    expect(result.ordinaryIncome).toBe(620_000);
    expect(result.pretaxIncome).toBe(630_000);
    expect(result.netIncome).toBe(530_000);
    expect(result.totalCost).toBe(740_000);
  });

  it("赤字ケースで当期純利益がマイナスになる", () => {
    const statement = createStatement([
      { id: "1", name: "売上高", category: "revenue", amount: 500_000 },
      { id: "2", name: "売上原価", category: "cogs", amount: 450_000 },
      { id: "3", name: "販管費", category: "sga", amount: 120_000 },
      { id: "4", name: "営業外費用", category: "nonOpExpense", amount: 40_000 },
      { id: "5", name: "法人税等", category: "tax", amount: 5_000 },
    ]);

    const result = calculateProfitAndLoss(statement);

    expect(result.grossProfit).toBe(50_000);
    expect(result.operatingIncome).toBe(-70_000);
    expect(result.ordinaryIncome).toBe(-110_000);
    expect(result.pretaxIncome).toBe(-110_000);
    expect(result.netIncome).toBe(-115_000);
  });

  it("ゼロ/欠損値は0円として扱う", () => {
    const statement = createStatement([
      { id: "1", name: "売上高", category: "revenue", amount: 0 },
      { id: "2", name: "売上原価", category: "cogs", amount: Number.NaN },
      { id: "3", name: "販管費", category: "sga", amount: undefined as unknown as number },
      { id: "4", name: "営業外収益", category: "nonOpIncome", amount: Number.POSITIVE_INFINITY },
    ]);

    const result = calculateProfitAndLoss(statement);

    expect(result).toEqual({
      revenue: 0,
      cogs: 0,
      grossProfit: 0,
      sga: 0,
      operatingIncome: 0,
      nonOperatingIncome: 0,
      nonOperatingExpense: 0,
      ordinaryIncome: 0,
      extraordinaryGain: 0,
      extraordinaryLoss: 0,
      pretaxIncome: 0,
      tax: 0,
      netIncome: 0,
      totalCost: 0,
    });
  });

  it("異常値(マイナス売上)でも計算順序を維持して結果を返す", () => {
    const statement = createStatement([
      { id: "1", name: "売上高", category: "revenue", amount: -100_000 },
      { id: "2", name: "売上原価", category: "cogs", amount: 40_000 },
      { id: "3", name: "販管費", category: "sga", amount: 10_000 },
      { id: "4", name: "法人税等", category: "tax", amount: 0 },
    ]);

    const result = calculateProfitAndLoss(statement);

    expect(result.grossProfit).toBe(-140_000);
    expect(result.operatingIncome).toBe(-150_000);
    expect(result.ordinaryIncome).toBe(-150_000);
    expect(result.pretaxIncome).toBe(-150_000);
    expect(result.netIncome).toBe(-150_000);
  });

  it("カテゴリ集計は同一カテゴリを合算し不正カテゴリは無視する", () => {
    const items = [
      { id: "1", name: "売上A", category: "revenue", amount: 100_000 },
      { id: "2", name: "売上B", category: "revenue", amount: 150_000 },
      { id: "3", name: "販管費", category: "sga", amount: 10_000 },
      { id: "4", name: "不正", category: "invalid", amount: 999_999 },
    ] as unknown as AccountItem[];

    const totals = buildCategoryTotals(items);

    expect(totals.revenue).toBe(250_000);
    expect(totals.sga).toBe(10_000);
    expect(totals.cogs).toBe(0);
    expect(totals.tax).toBe(0);
  });
});
