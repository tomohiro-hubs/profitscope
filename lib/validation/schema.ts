import { z } from "zod";

import type {
  AccountCategory,
  FinancialStatement,
  MonthNumber,
  MonthlyFinancialStatement,
  TaxSettings,
} from "@/types";

const ACCOUNT_CATEGORIES = [
  "revenue",
  "cogs",
  "sga",
  "nonOpIncome",
  "nonOpExpense",
  "extraordinaryGain",
  "extraordinaryLoss",
  "tax",
  "exclude",
] as const satisfies readonly AccountCategory[];

const MIN_FISCAL_YEAR = 1900;
const MAX_FISCAL_YEAR = 2100;
const MAX_ABS_MONEY = 9_000_000_000_000;

/**
 * 入力値のバリデーションポリシー。
 * - 数値の文字列変換は行わず、number 型のみを受け付ける。
 * - null / undefined / NaN / Infinity は不正として扱う。
 * - 金額・年度・月は整数のみ許可し、小数は不正として扱う。
 * - 過度な値は弾く(年度: 1900〜2100、金額: ±9兆円)。
 */
export const validationPolicyJa = {
  numeric: "数値は number 型のみ受け付け、文字列からの自動変換は行いません。",
  finite: "null / undefined / NaN / Infinity は受け付けません。",
  integer:
    "金額・年度・月は整数のみ受け付けます。小数は正規化せずエラーにします。",
  bounds: "年度は 1900〜2100、金額は ±9兆円の範囲に制限します。",
} as const;

const accountCategorySchema = z.enum(ACCOUNT_CATEGORIES, {
  required_error: "カテゴリは必須です。",
  invalid_type_error: "カテゴリは必須です。",
});

const requiredTextSchema = (fieldLabel: string) =>
  z
    .string({
      required_error: `${fieldLabel}は必須です。`,
      invalid_type_error: `${fieldLabel}は文字列で入力してください。`,
    })
    .trim()
    .min(1, `${fieldLabel}は必須です。`);

const integerNumberSchema = (
  fieldLabel: string,
  options?: { min?: number; max?: number },
) => {
  let schema = z
    .number({
      required_error: `${fieldLabel}は必須です。`,
      invalid_type_error: `${fieldLabel}は数値で入力してください。`,
    })
    .finite(`${fieldLabel}は有限の数値で入力してください。`)
    .int(`${fieldLabel}は整数で入力してください。`);

  if (options?.min !== undefined) {
    schema = schema.min(options.min, `${fieldLabel}は${options.min}以上で入力してください。`);
  }

  if (options?.max !== undefined) {
    schema = schema.max(options.max, `${fieldLabel}は${options.max}以下で入力してください。`);
  }

  return schema;
};

const taxRateNumberSchema = z
  .number({
    required_error: "概算税率は必須です。",
    invalid_type_error: "概算税率は数値で入力してください。",
  })
  .finite("概算税率は有限の数値で入力してください。")
  .min(0, "概算税率は0以上で入力してください。")
  .max(100, "概算税率は100以下で入力してください。");

export const accountItemSchema = z.object({
  id: requiredTextSchema("勘定科目ID"),
  name: requiredTextSchema("勘定科目名"),
  category: accountCategorySchema,
  amount: integerNumberSchema("金額", { min: -MAX_ABS_MONEY, max: MAX_ABS_MONEY }),
});

const monthlyAmountSchema = z.object({
  month: integerNumberSchema("月", { min: 1, max: 12 }).transform(
    (month): MonthNumber => month as MonthNumber,
  ),
  amount: integerNumberSchema("月次金額", {
    min: -MAX_ABS_MONEY,
    max: MAX_ABS_MONEY,
  }),
});

const monthlyAmountsSchema = z
  .array(monthlyAmountSchema, {
    invalid_type_error: "月次データは配列で入力してください。",
    required_error: "月次データは必須です。",
  })
  .superRefine((monthlyAmounts, ctx) => {
    const usedMonth = new Set<number>();

    monthlyAmounts.forEach((monthlyAmount, index) => {
      if (usedMonth.has(monthlyAmount.month)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "月は重複できません。",
          path: [index, "month"],
        });
      }
      usedMonth.add(monthlyAmount.month);
    });
  });

export const monthlyAccountItemSchema = z.object({
  id: requiredTextSchema("勘定科目ID"),
  name: requiredTextSchema("勘定科目名"),
  category: accountCategorySchema,
  monthlyAmounts: monthlyAmountsSchema,
});

export const financialStatementSchema = z.object({
  fiscalYear: integerNumberSchema("会計年度", {
    min: MIN_FISCAL_YEAR,
    max: MAX_FISCAL_YEAR,
  }),
  items: z
    .array(accountItemSchema, {
      invalid_type_error: "勘定科目一覧は配列で入力してください。",
      required_error: "勘定科目一覧は必須です。",
    })
    .min(1, "勘定科目を1件以上入力してください。"),
  investedCapital: integerNumberSchema("投下資本", {
    min: 0,
    max: MAX_ABS_MONEY,
  }),
}) satisfies z.ZodType<FinancialStatement, z.ZodTypeDef, unknown>;

export const monthlyFinancialStatementSchema = z.object({
  fiscalYear: integerNumberSchema("会計年度", {
    min: MIN_FISCAL_YEAR,
    max: MAX_FISCAL_YEAR,
  }),
  items: z
    .array(monthlyAccountItemSchema, {
      invalid_type_error: "勘定科目一覧は配列で入力してください。",
      required_error: "勘定科目一覧は必須です。",
    })
    .min(1, "勘定科目を1件以上入力してください。"),
  investedCapital: integerNumberSchema("投下資本", {
    min: 0,
    max: MAX_ABS_MONEY,
  }),
}) satisfies z.ZodType<MonthlyFinancialStatement, z.ZodTypeDef, unknown>;

export const taxSettingsSchema: z.ZodType<TaxSettings> = z
  .object({
    mode: z.enum(["manual", "estimated"], {
      required_error: "税計算モードは必須です。",
      invalid_type_error: "税計算モードが不正です。",
    }),
    estimatedTaxRate: taxRateNumberSchema.optional(),
  })
  .superRefine((settings, ctx) => {
    if (settings.mode === "estimated" && settings.estimatedTaxRate === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["estimatedTaxRate"],
        message: "概算税率モードでは概算税率の入力が必須です。",
      });
    }
  });

export const safeParseFinancialStatement = (input: unknown) =>
  financialStatementSchema.safeParse(input);

export const safeParseMonthlyFinancialStatement = (input: unknown) =>
  monthlyFinancialStatementSchema.safeParse(input);
