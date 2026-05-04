import { describe, expect, it } from "vitest";
import { calculateKpis, calculateRoi } from "../lib/finance/metrics";
import type { ProfitAndLossSummary } from "../types";

const baseSummary: ProfitAndLossSummary = {
  revenue: 1_000_000,
  cogs: 300_000,
  grossProfit: 700_000,
  sga: 200_000,
  operatingIncome: 500_000,
  nonOperatingIncome: 50_000,
  nonOperatingExpense: 20_000,
  ordinaryIncome: 530_000,
  extraordinaryGain: 10_000,
  extraordinaryLoss: 5_000,
  pretaxIncome: 535_000,
  tax: 100_000,
  netIncome: 435_000,
  totalCost: 625_000,
};

describe("指標ロジック", () => {
  it("ROI利益種別を切り替えて計算できる", () => {
    const investedCapital = 2_000_000;

    const operatingRoi = calculateRoi(baseSummary, investedCapital, "operatingIncome");
    const ordinaryRoi = calculateRoi(baseSummary, investedCapital, "ordinaryIncome");
    const netRoi = calculateRoi(baseSummary, investedCapital, "netIncome");

    expect(operatingRoi.profitValue).toBe(500_000);
    expect(ordinaryRoi.profitValue).toBe(530_000);
    expect(netRoi.profitValue).toBe(435_000);
    expect(operatingRoi.roi).toBe(25);
    expect(ordinaryRoi.roi).toBe(26.5);
    expect(netRoi.roi).toBe(21.75);
  });

  it("通常ケース(黒字)でKPIを計算できる", () => {
    const result = calculateKpis(baseSummary, "netIncome", 2_000_000);

    expect(result.grossProfitMargin).toBe(70);
    expect(result.operatingMargin).toBe(50);
    expect(result.ordinaryMargin).toBe(53);
    expect(result.netMargin).toBe(43.5);
    expect(result.costRatio).toBe(62.5);
    expect(result.roi).toBe(21.75);
  });

  it("赤字ケースで利益率とROIがマイナスになる", () => {
    const deficitSummary: ProfitAndLossSummary = {
      ...baseSummary,
      revenue: 500_000,
      grossProfit: -20_000,
      operatingIncome: -60_000,
      ordinaryIncome: -80_000,
      pretaxIncome: -80_000,
      netIncome: -100_000,
      totalCost: 600_000,
    };

    const result = calculateKpis(deficitSummary, "netIncome", 1_000_000);

    expect(result.grossProfitMargin).toBe(-4);
    expect(result.operatingMargin).toBe(-12);
    expect(result.ordinaryMargin).toBe(-16);
    expect(result.netMargin).toBe(-20);
    expect(result.costRatio).toBe(120);
    expect(result.roi).toBe(-10);
  });

  it("売上0のときは利益率と費用率がnullになる", () => {
    const zeroRevenueSummary: ProfitAndLossSummary = {
      ...baseSummary,
      revenue: 0,
      grossProfit: 0,
      operatingIncome: 0,
      ordinaryIncome: 0,
      netIncome: 0,
      totalCost: 0,
    };

    const result = calculateKpis(zeroRevenueSummary, "operatingIncome", 1_000_000);

    expect(result.grossProfitMargin).toBeNull();
    expect(result.operatingMargin).toBeNull();
    expect(result.ordinaryMargin).toBeNull();
    expect(result.netMargin).toBeNull();
    expect(result.costRatio).toBeNull();
    expect(result.roi).toBe(0);
  });

  it("投下資本0のときROIはnullになる", () => {
    const result = calculateRoi(baseSummary, 0, "operatingIncome");

    expect(result.profitType).toBe("operatingIncome");
    expect(result.investedCapital).toBe(0);
    expect(result.roi).toBeNull();
  });

  it("ROIの0除算は利益が負値でもnullを返す", () => {
    const deficitSummary: ProfitAndLossSummary = {
      ...baseSummary,
      operatingIncome: -1,
    };

    const result = calculateRoi(deficitSummary, 0, "operatingIncome");

    expect(result.profitValue).toBe(-1);
    expect(result.roi).toBeNull();
  });
});
