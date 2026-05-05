import { afterEach, describe, expect, it, vi } from "vitest";

import { getD1Config } from "../lib/db/cloudflareD1";
import { getLatestState, saveLatestState } from "../lib/db/persistence";
import type { DashboardPersistedState } from "../types";

const originalEnv = { ...process.env };

const validState: DashboardPersistedState = {
  annualInput: {
    fiscalYear: 2026,
    investedCapital: 5_000_000,
    items: [{ id: "a-1", name: "売上高", category: "revenue", amount: 10_000_000 }],
  },
  monthlyInput: {
    fiscalYear: 2026,
    investedCapital: 5_000_000,
    items: [
      {
        id: "m-1",
        name: "売上高",
        category: "revenue",
        monthlyAmounts: [{ month: 1, amount: 1_000_000 }],
      },
    ],
  },
  roiProfitType: "operatingIncome",
  taxMode: "manual",
  estimatedTaxRate: 30,
  isConsumptionTaxManual: false,
  consumptionTaxAmount: 0,
  costBreakdownMode: "category",
};

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe("D1接続設定", () => {
  it("異常系: 環境変数不足時は null を返す", () => {
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_DATABASE_ID;
    delete process.env.CLOUDFLARE_D1_API_TOKEN;

    expect(getD1Config()).toBeNull();
  });
});

describe("D1永続化ロジック", () => {
  it("正常系: 保存して最新状態を取得できる", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          result: [{ success: true, results: [] }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          result: [{ success: true, results: [{ state_json: JSON.stringify(validState) }] }],
        }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const config = {
      accountId: "account",
      databaseId: "database",
      apiToken: "token",
    };

    const saved = await saveLatestState(config, validState);
    const loaded = await getLatestState(config);

    expect(saved).toEqual(validState);
    expect(loaded).toEqual(validState);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
