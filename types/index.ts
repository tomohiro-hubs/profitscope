/**
 * ProfitScope の共通型定義。
 * 会計計算・指標計算・UI 表示のインターフェース契約として利用する。
 */

/** 円単位の金額。内部計算は整数を前提とする。 */
export type Money = number;

/** 月番号。1〜12を想定。 */
export type MonthNumber =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12;

export type AccountCategory =
  | "revenue"
  | "cogs"
  | "sga"
  | "nonOpIncome"
  | "nonOpExpense"
  | "extraordinaryGain"
  | "extraordinaryLoss"
  | "tax"
  | "exclude";

/**
 * 勘定科目。
 * name は表示用の日本語名を格納する。
 */
export interface AccountItem {
  id: string;
  name: string;
  category: AccountCategory;
  amount: Money;
}

/** 月次金額。 */
export interface MonthlyAmount {
  month: MonthNumber;
  amount: Money;
}

/**
 * 月次入力を扱う勘定科目。
 * 年次集計が必要な場合は monthlyAmounts の合計値を利用する。
 */
export interface MonthlyAccountItem {
  id: string;
  name: string;
  category: AccountCategory;
  monthlyAmounts: MonthlyAmount[];
}

/** 年次財務入力データ。 */
export interface FinancialStatement {
  fiscalYear: number;
  items: AccountItem[];
  investedCapital: Money;
}

/** 月次財務入力データ。 */
export interface MonthlyFinancialStatement {
  fiscalYear: number;
  items: MonthlyAccountItem[];
  investedCapital: Money;
}

/** ROI の利益定義。 */
export type RoiProfitType = "operatingIncome" | "ordinaryIncome" | "netIncome";

/** 損益計算の集計結果。 */
export interface ProfitAndLossSummary {
  revenue: Money;
  cogs: Money;
  grossProfit: Money;
  sga: Money;
  operatingIncome: Money;
  nonOperatingIncome: Money;
  nonOperatingExpense: Money;
  ordinaryIncome: Money;
  extraordinaryGain: Money;
  extraordinaryLoss: Money;
  pretaxIncome: Money;
  tax: Money;
  netIncome: Money;
  totalCost: Money;
}

/**
 * KPI 指標。割合はパーセント表記(0〜100)を返す。
 * 分母が 0 の場合は null を返し、UI 側で "-" 表示とする。
 */
export interface KpiMetrics {
  grossProfitMargin: number | null;
  operatingMargin: number | null;
  ordinaryMargin: number | null;
  netMargin: number | null;
  costRatio: number | null;
  roi: number | null;
}

/** ROI 計算結果。 */
export interface RoiResult {
  profitType: RoiProfitType;
  profitValue: Money;
  investedCapital: Money;
  roi: number | null;
}

/** 税計算設定。 */
export interface TaxSettings {
  mode: "manual" | "estimated";
  estimatedTaxRate?: number;
}

/** 年次計算結果。 */
export interface FinancialCalculationResult {
  summary: ProfitAndLossSummary;
  kpis: KpiMetrics;
  roi: RoiResult;
}

/** 月次計算結果。 */
export interface MonthlyCalculationResult {
  month: MonthNumber;
  summary: ProfitAndLossSummary;
  kpis: KpiMetrics;
  roi: RoiResult;
}

/** ダッシュボード描画用の最終出力。 */
export interface DashboardData {
  fiscalYear: number;
  annual: FinancialCalculationResult;
  monthly: MonthlyCalculationResult[];
}

/** 費用内訳チャートの表示モード。 */
export type CostBreakdownMode = "category" | "item";

/** ダッシュボード永続化データ。 */
export interface DashboardPersistedState {
  annualInput: FinancialStatement;
  monthlyInput: MonthlyFinancialStatement;
  roiProfitType: RoiProfitType;
  taxMode: TaxSettings["mode"];
  estimatedTaxRate: number;
  isConsumptionTaxManual: boolean;
  consumptionTaxAmount: Money;
  costBreakdownMode: CostBreakdownMode;
}

/**
 * カテゴリ別集計マップ。
 * accounting/finance ロジック内部で中間表現として利用可能。
 */
export type CategoryTotals = Record<AccountCategory, Money>;
