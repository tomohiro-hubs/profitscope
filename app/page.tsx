"use client";

import { useEffect, useMemo, useState } from "react";

import {
  CostBreakdownChart,
  MonthlyTrendChart,
  ProfitWaterfallChart,
} from "@/components/charts";
import {
  AccountItemTable,
  FinancialInputForm,
  KpiCards,
  SummaryCards,
} from "@/components/ui";
import {
  calculateMonthlyProfitAndLoss,
  calculateProfitAndLoss,
} from "@/lib/accounting";
import { calculateKpis, calculateRoi, calculateYearOverYear } from "@/lib/finance";
import {
  createAnnualTemplateCsv,
  createMonthlyTemplateCsv,
  formatCurrency,
  formatPercent,
  withUtf8Bom,
} from "@/lib/format";
import {
  safeParseFinancialStatement,
  safeParseMonthlyFinancialStatement,
  taxSettingsSchema,
  validationPolicyJa,
} from "@/lib/validation";
import {
  sampleAnnualStatement,
  sampleMonthlyStatement,
  samplePreviousAnnualStatement,
} from "@/data";
import type {
  AccountCategory,
  AccountItem,
  FinancialStatement,
  MonthlyAmount,
  MonthlyCalculationResult,
  MonthlyFinancialStatement,
  RoiProfitType,
  TaxSettings,
} from "@/types";

const STORAGE_KEY = "profitscope-dashboard-state-v1";

const createEmptyAnnualStatement = (): FinancialStatement => ({
  fiscalYear: new Date().getFullYear(),
  investedCapital: 0,
  items: [
    {
      id: "tax-default",
      name: "法人税等",
      category: "tax",
      amount: 0,
    },
  ],
});

const createEmptyMonthlyStatement = (): MonthlyFinancialStatement => ({
  fiscalYear: new Date().getFullYear(),
  investedCapital: 0,
  items: [
    {
      id: "tax-monthly-default",
      name: "法人税等",
      category: "tax",
      monthlyAmounts: Array.from({ length: 12 }, (_, index) => ({
        month: (index + 1) as MonthlyAmount["month"],
        amount: 0,
      })),
    },
  ],
});

const initialAnnualStatement: FinancialStatement = (() => {
  const parsed = safeParseFinancialStatement(sampleAnnualStatement);
  return parsed.success ? parsed.data : createEmptyAnnualStatement();
})();

const initialPreviousAnnualStatement: FinancialStatement = (() => {
  const parsed = safeParseFinancialStatement(samplePreviousAnnualStatement);
  return parsed.success ? parsed.data : createEmptyAnnualStatement();
})();

const initialMonthlyStatement: MonthlyFinancialStatement = (() => {
  const parsed = safeParseMonthlyFinancialStatement(sampleMonthlyStatement);
  return parsed.success ? parsed.data : createEmptyMonthlyStatement();
})();

const ROI_OPTIONS: Array<{ value: RoiProfitType; label: string }> = [
  { value: "operatingIncome", label: "営業利益" },
  { value: "ordinaryIncome", label: "経常利益" },
  { value: "netIncome", label: "当期純利益" },
];

const TAX_MODE_OPTIONS: Array<{ value: TaxSettings["mode"]; label: string }> = [
  { value: "manual", label: "手入力" },
  { value: "estimated", label: "概算税率" },
];

const roundToInteger = (value: number): number => Math.round(value);

const sanitizeAmount = (value: number | null): number => {
  if (value === null || !Number.isFinite(value)) {
    return 0;
  }

  return roundToInteger(value);
};

const createItemId = (): string => {
  return `item-${Date.now()}-${Math.floor(Math.random() * 100_000)}`;
};

const withTaxAmount = (items: AccountItem[], taxAmount: number): AccountItem[] => {
  const normalizedTax = roundToInteger(Math.max(0, taxAmount));
  const taxIndexes: number[] = [];

  items.forEach((item, index) => {
    if (item.category === "tax") {
      taxIndexes.push(index);
    }
  });

  if (taxIndexes.length === 0) {
    return [
      ...items,
      {
        id: "tax-auto",
        name: "法人税等",
        category: "tax",
        amount: normalizedTax,
      },
    ];
  }

  return items.map((item, index) => {
    if (item.category !== "tax") {
      return item;
    }

    return {
      ...item,
      amount: index === taxIndexes[0] ? normalizedTax : 0,
    };
  });
};

const withMonthlyTaxAmounts = (
  statement: MonthlyFinancialStatement,
  taxByMonth: Map<number, number>,
): MonthlyFinancialStatement => {
  const taxIndexes: number[] = [];

  statement.items.forEach((item, index) => {
    if (item.category === "tax") {
      taxIndexes.push(index);
    }
  });

  const normalizedTaxAmounts: MonthlyAmount[] = Array.from({ length: 12 }, (_, index) => {
    const month = (index + 1) as MonthlyAmount["month"];
    return {
      month,
      amount: roundToInteger(Math.max(0, taxByMonth.get(month) ?? 0)),
    };
  });

  if (taxIndexes.length === 0) {
    return {
      ...statement,
      items: [
        ...statement.items,
        {
          id: "tax-monthly-auto",
          name: "法人税等",
          category: "tax",
          monthlyAmounts: normalizedTaxAmounts,
        },
      ],
    };
  }

  return {
    ...statement,
    items: statement.items.map((item, index) => {
      if (item.category !== "tax") {
        return item;
      }

      return {
        ...item,
        monthlyAmounts: index === taxIndexes[0] ? normalizedTaxAmounts : [],
      };
    }),
  };
};

const estimateTaxFromPretaxIncome = (pretaxIncome: number, taxRate: number): number => {
  const taxableIncome = Math.max(0, pretaxIncome);
  return roundToInteger((taxableIncome * taxRate) / 100);
};

const applyEstimatedTaxToAnnual = (
  statement: FinancialStatement,
  estimatedTaxRate: number,
): FinancialStatement => {
  const withoutTax: FinancialStatement = {
    ...statement,
    items: withTaxAmount(statement.items, 0),
  };
  const pretaxSummary = calculateProfitAndLoss(withoutTax);
  const estimatedTax = estimateTaxFromPretaxIncome(pretaxSummary.pretaxIncome, estimatedTaxRate);

  return {
    ...statement,
    items: withTaxAmount(statement.items, estimatedTax),
  };
};

const applyEstimatedTaxToMonthly = (
  statement: MonthlyFinancialStatement,
  estimatedTaxRate: number,
): MonthlyFinancialStatement => {
  const zeroTaxStatement = withMonthlyTaxAmounts(statement, new Map());
  const monthlySummaries = calculateMonthlyProfitAndLoss(zeroTaxStatement);

  const taxByMonth = new Map<number, number>();
  monthlySummaries.forEach(({ month, summary }) => {
    taxByMonth.set(month, estimateTaxFromPretaxIncome(summary.pretaxIncome, estimatedTaxRate));
  });

  return withMonthlyTaxAmounts(statement, taxByMonth);
};

const extractValidationMessages = (issues: Array<{ path: Array<string | number>; message: string }>): string[] => {
  return issues.map((issue) => {
    const field = issue.path.length > 0 ? issue.path.join(".") : "入力";
    return `${field}: ${issue.message}`;
  });
};

const downloadCsv = (filename: string, csv: string): void => {
  const blob = new Blob([withUtf8Bom(csv)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default function DashboardPage(): React.JSX.Element {
  const [annualInput, setAnnualInput] = useState<FinancialStatement>(initialAnnualStatement);
  const [monthlyInput, setMonthlyInput] = useState<MonthlyFinancialStatement>(initialMonthlyStatement);
  const [previousAnnualInput] = useState<FinancialStatement>(initialPreviousAnnualStatement);
  const [roiProfitType, setRoiProfitType] = useState<RoiProfitType>("operatingIncome");
  const [taxMode, setTaxMode] = useState<TaxSettings["mode"]>("manual");
  const [estimatedTaxRate, setEstimatedTaxRate] = useState<number>(30);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        return;
      }

      const parsed = JSON.parse(saved) as {
        annualInput?: unknown;
        monthlyInput?: unknown;
        roiProfitType?: unknown;
        taxMode?: unknown;
        estimatedTaxRate?: unknown;
      };

      const parsedAnnual = safeParseFinancialStatement(parsed.annualInput);
      if (parsedAnnual.success) {
        setAnnualInput(parsedAnnual.data);
      }

      const parsedMonthly = safeParseMonthlyFinancialStatement(parsed.monthlyInput);
      if (parsedMonthly.success) {
        setMonthlyInput(parsedMonthly.data);
      }

      if (
        parsed.roiProfitType === "operatingIncome" ||
        parsed.roiProfitType === "ordinaryIncome" ||
        parsed.roiProfitType === "netIncome"
      ) {
        setRoiProfitType(parsed.roiProfitType);
      }

      if (parsed.taxMode === "manual" || parsed.taxMode === "estimated") {
        setTaxMode(parsed.taxMode);
      }

      if (typeof parsed.estimatedTaxRate === "number" && Number.isFinite(parsed.estimatedTaxRate)) {
        setEstimatedTaxRate(parsed.estimatedTaxRate);
      }
    } catch {
      // localStorage が利用できない環境では永続化を無効化する
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          annualInput,
          monthlyInput,
          roiProfitType,
          taxMode,
          estimatedTaxRate,
        }),
      );
    } catch {
      // localStorage が利用できない環境では永続化を無効化する
    }
  }, [annualInput, monthlyInput, roiProfitType, taxMode, estimatedTaxRate]);

  const annualValidation = useMemo(() => safeParseFinancialStatement(annualInput), [annualInput]);
  const monthlyValidation = useMemo(() => safeParseMonthlyFinancialStatement(monthlyInput), [monthlyInput]);

  const taxSettings = useMemo<TaxSettings>(() => {
    const parsed = taxSettingsSchema.safeParse({
      mode: taxMode,
      estimatedTaxRate,
    });

    if (!parsed.success) {
      return { mode: "manual" };
    }

    return parsed.data;
  }, [estimatedTaxRate, taxMode]);

  const annualStatementForCalc = useMemo<FinancialStatement>(() => {
    const base = annualValidation.success ? annualValidation.data : initialAnnualStatement;

    if (taxSettings.mode === "estimated") {
      return applyEstimatedTaxToAnnual(base, taxSettings.estimatedTaxRate ?? 0);
    }

    return base;
  }, [annualValidation, taxSettings]);

  const monthlyStatementForCalc = useMemo<MonthlyFinancialStatement>(() => {
    const base = monthlyValidation.success ? monthlyValidation.data : initialMonthlyStatement;

    if (taxSettings.mode === "estimated") {
      return applyEstimatedTaxToMonthly(base, taxSettings.estimatedTaxRate ?? 0);
    }

    return base;
  }, [monthlyValidation, taxSettings]);

  const annualSummary = useMemo(
    () => calculateProfitAndLoss(annualStatementForCalc),
    [annualStatementForCalc],
  );

  const annualKpis = useMemo(
    () => calculateKpis(annualSummary, roiProfitType, annualStatementForCalc.investedCapital),
    [annualSummary, annualStatementForCalc.investedCapital, roiProfitType],
  );

  const annualRoi = useMemo(
    () => calculateRoi(annualSummary, annualStatementForCalc.investedCapital, roiProfitType),
    [annualSummary, annualStatementForCalc.investedCapital, roiProfitType],
  );

  const monthlyResults = useMemo<MonthlyCalculationResult[]>(() => {
    return calculateMonthlyProfitAndLoss(monthlyStatementForCalc).map(({ month, summary }) => {
      return {
        month,
        summary,
        kpis: calculateKpis(summary, roiProfitType, monthlyStatementForCalc.investedCapital),
        roi: calculateRoi(summary, monthlyStatementForCalc.investedCapital, roiProfitType),
      };
    });
  }, [monthlyStatementForCalc, roiProfitType]);

  const previousAnnualSummary = useMemo(
    () => calculateProfitAndLoss(previousAnnualInput),
    [previousAnnualInput],
  );

  const yoy = useMemo(() => {
    return {
      revenue: calculateYearOverYear(annualSummary.revenue, previousAnnualSummary.revenue),
      operatingIncome: calculateYearOverYear(
        annualSummary.operatingIncome,
        previousAnnualSummary.operatingIncome,
      ),
      netIncome: calculateYearOverYear(annualSummary.netIncome, previousAnnualSummary.netIncome),
    };
  }, [annualSummary, previousAnnualSummary]);

  const validationMessages = useMemo(() => {
    const messages: string[] = [];

    if (!annualValidation.success) {
      messages.push(...extractValidationMessages(annualValidation.error.issues));
    }

    if (!monthlyValidation.success) {
      messages.push(...extractValidationMessages(monthlyValidation.error.issues));
    }

    const taxValidation = taxSettingsSchema.safeParse({ mode: taxMode, estimatedTaxRate });
    if (!taxValidation.success) {
      messages.push(...extractValidationMessages(taxValidation.error.issues));
    }

    return messages;
  }, [annualValidation, monthlyValidation, taxMode, estimatedTaxRate]);

  const handleFiscalYearChange = (year: number): void => {
    setAnnualInput((prev) => ({
      ...prev,
      fiscalYear: Number.isFinite(year) ? roundToInteger(year) : prev.fiscalYear,
    }));
    setMonthlyInput((prev) => ({
      ...prev,
      fiscalYear: Number.isFinite(year) ? roundToInteger(year) : prev.fiscalYear,
    }));
  };

  const handleInvestedCapitalChange = (value: number | null): void => {
    const nextValue = sanitizeAmount(value);

    setAnnualInput((prev) => ({ ...prev, investedCapital: nextValue }));
    setMonthlyInput((prev) => ({ ...prev, investedCapital: nextValue }));
  };

  const handleAddItem = (input: {
    name: string;
    category: AccountCategory;
    amount: number | null;
  }): void => {
    setAnnualInput((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: createItemId(),
          name: input.name,
          category: input.category,
          amount: sanitizeAmount(input.amount),
        },
      ],
    }));
  };

  const handleUpdateItem = (
    itemId: string,
    input: { name: string; category: AccountCategory; amount: number | null },
  ): void => {
    setAnnualInput((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id !== itemId) {
          return item;
        }

        return {
          ...item,
          name: input.name,
          category: input.category,
          amount: sanitizeAmount(input.amount),
        };
      }),
    }));
  };

  const handleDeleteItem = (itemId: string): void => {
    setAnnualInput((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== itemId),
    }));
  };

  const displayItems = annualStatementForCalc.items.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    amount: item.amount,
  }));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">ProfitScope ダッシュボード</h1>
              <p className="mt-1 text-sm text-slate-600">
                会計年度 {annualStatementForCalc.fiscalYear} の財務状況をリアルタイムで可視化
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-sm text-slate-700">
                ROI 利益種別
                <select
                  value={roiProfitType}
                  onChange={(event) => setRoiProfitType(event.target.value as RoiProfitType)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                >
                  {ROI_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="text-sm text-slate-700">
                <p>税計算モード</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {TAX_MODE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTaxMode(option.value)}
                      className={`rounded-md border px-3 py-2 ${
                        taxMode === option.value
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-300 bg-white text-slate-700"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadCsv("profitscope_template_annual.csv", createAnnualTemplateCsv())}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              年次テンプレートDL（Excel用CSV）
            </button>
            <button
              type="button"
              onClick={() => downloadCsv("profitscope_template_monthly.csv", createMonthlyTemplateCsv())}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              月次テンプレートDL（Excel用CSV）
            </button>
          </div>

          {taxMode === "estimated" ? (
            <div className="mt-4 grid gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
              <label className="text-slate-700">
                概算税率 (%)
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={estimatedTaxRate}
                  onChange={(event) => setEstimatedTaxRate(Number(event.target.value))}
                  className="mt-1 w-40 rounded-md border border-slate-300 bg-white px-3 py-2"
                />
              </label>
              <p className="text-xs text-slate-600">
                概算税率モードでは法人税等を税率から再計算し、taxカテゴリに反映します。
              </p>
            </div>
          ) : null}
        </section>

        <SummaryCards summary={annualSummary} />

        <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">前年比: 売上高</p>
            <p className={`mt-1 text-xl font-semibold ${(yoy.revenue ?? 0) < 0 ? "text-rose-600" : "text-emerald-600"}`}>
              {formatPercent(yoy.revenue)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              前年 {formatCurrency(previousAnnualSummary.revenue)}
            </p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">前年比: 営業利益</p>
            <p
              className={`mt-1 text-xl font-semibold ${(yoy.operatingIncome ?? 0) < 0 ? "text-rose-600" : "text-emerald-600"}`}
            >
              {formatPercent(yoy.operatingIncome)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              前年 {formatCurrency(previousAnnualSummary.operatingIncome)}
            </p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">前年比: 当期純利益</p>
            <p className={`mt-1 text-xl font-semibold ${(yoy.netIncome ?? 0) < 0 ? "text-rose-600" : "text-emerald-600"}`}>
              {formatPercent(yoy.netIncome)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              前年 {formatCurrency(previousAnnualSummary.netIncome)}
            </p>
          </article>
        </section>

        <KpiCards
          metrics={{
            ...annualKpis,
            roi: annualRoi.roi,
          }}
        />

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">費用内訳</h2>
            <p className="text-xs text-slate-500">売上原価・販管費・営業外費用・特別損失・法人税等</p>
            <CostBreakdownChart summary={annualSummary} />
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">損益ウォーターフォール</h2>
            <p className="text-xs text-slate-500">売上から当期純利益までの増減を表示</p>
            <ProfitWaterfallChart summary={annualSummary} />
          </article>
        </section>

        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">月次推移</h2>
          <p className="text-xs text-slate-500">売上高・営業利益・当期純利益</p>
          <MonthlyTrendChart monthly={monthlyResults} />
        </article>

        <FinancialInputForm
          fiscalYear={annualInput.fiscalYear}
          investedCapital={annualInput.investedCapital}
          items={annualInput.items}
          onFiscalYearChange={handleFiscalYearChange}
          onInvestedCapitalChange={handleInvestedCapitalChange}
          onAddItem={handleAddItem}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
        />

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">勘定科目一覧（計算適用後）</h2>
          <p className="text-xs text-slate-500">
            税計算モードが概算税率の場合、法人税等は再計算後の金額を表示します。
          </p>
          <div className="mt-3">
            <AccountItemTable items={displayItems} />
          </div>
        </section>

        {validationMessages.length > 0 ? (
          <section className="rounded-lg border border-rose-200 bg-rose-50 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-rose-700">入力エラー</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-rose-700">
              {validationMessages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </section>
        ) : (
          <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-emerald-700">入力チェック</h2>
            <p className="mt-1 text-xs text-emerald-700">すべての入力は zod スキーマの検証を通過しています。</p>
          </section>
        )}

        <section className="rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-600 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">バリデーション方針</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>{validationPolicyJa.numeric}</li>
            <li>{validationPolicyJa.finite}</li>
            <li>{validationPolicyJa.integer}</li>
            <li>{validationPolicyJa.bounds}</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
