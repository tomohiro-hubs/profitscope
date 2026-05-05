import { z } from "zod";

import type { DashboardPersistedState } from "@/types";
import {
  financialStatementSchema,
  monthlyFinancialStatementSchema,
} from "@/lib/validation";

import type { D1Config } from "./cloudflareD1";
import { queryD1 } from "./cloudflareD1";

const roiProfitTypeSchema = z.enum(["operatingIncome", "ordinaryIncome", "netIncome"]);
const taxModeSchema = z.enum(["manual", "estimated"]);
const costBreakdownModeSchema = z.enum(["category", "item"]);

export const dashboardPersistedStateSchema = z
  .object({
    annualInput: financialStatementSchema,
    monthlyInput: monthlyFinancialStatementSchema,
    roiProfitType: roiProfitTypeSchema,
    taxMode: taxModeSchema,
    estimatedTaxRate: z
      .number({ invalid_type_error: "概算税率は数値で入力してください。" })
      .finite("概算税率は有限の数値で入力してください。")
      .min(0, "概算税率は0以上で入力してください。")
      .max(100, "概算税率は100以下で入力してください。"),
    isConsumptionTaxManual: z.boolean({
      invalid_type_error: "消費税手入力フラグは真偽値で入力してください。",
    }),
    consumptionTaxAmount: z
      .number({ invalid_type_error: "消費税額は数値で入力してください。" })
      .finite("消費税額は有限の数値で入力してください。")
      .int("消費税額は整数で入力してください。")
      .min(0, "消費税額は0以上で入力してください。"),
    costBreakdownMode: costBreakdownModeSchema,
  })
  .strict() satisfies z.ZodType<DashboardPersistedState, z.ZodTypeDef, unknown>;

const stateRecordSchema = z.object({
  state_json: z.string(),
});

const UPSERT_SQL = `
INSERT INTO dashboard_state (id, state_json, updated_at)
VALUES (1, ?, datetime('now'))
ON CONFLICT(id) DO UPDATE SET
  state_json = excluded.state_json,
  updated_at = datetime('now')
`;

/**
 * 永続化テーブルから最新のダッシュボード状態を取得する。
 */
export const getLatestState = async (config: D1Config): Promise<DashboardPersistedState | null> => {
  const rows = await queryD1(config, "SELECT state_json FROM dashboard_state WHERE id = 1 LIMIT 1");

  if (rows.length === 0) {
    return null;
  }

  const parsedRow = stateRecordSchema.safeParse(rows[0]);
  if (!parsedRow.success) {
    throw new Error("DBの保存データ形式が不正です。");
  }

  const parsedStateJson = JSON.parse(parsedRow.data.state_json) as unknown;
  const parsedState = dashboardPersistedStateSchema.safeParse(parsedStateJson);

  if (!parsedState.success) {
    throw new Error("DBの保存データがスキーマに一致しません。");
  }

  return parsedState.data;
};

/**
 * ダッシュボード状態を単一レコードとして保存する。
 */
export const saveLatestState = async (
  config: D1Config,
  input: unknown,
): Promise<DashboardPersistedState> => {
  const parsed = dashboardPersistedStateSchema.safeParse(input);

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "入力データが不正です。";
    throw new Error(message);
  }

  const state = parsed.data;
  await queryD1(config, UPSERT_SQL, [JSON.stringify(state)]);

  return state;
};
