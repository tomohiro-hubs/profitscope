"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

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
  parseLedgerCsv,
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
  fetchLatestStatement,
  saveLatestStatement,
} from "@/lib/client/statements";
import { fetchMe, logout } from "@/lib/client/auth";
import {
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
  DashboardPersistedState,
  TaxSettings,
} from "@/types";

const FISCAL_PERIOD_START_MONTH = 6;
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const IS_GITHUB_PAGES = process.env.NEXT_PUBLIC_IS_GITHUB_PAGES === "true";
const LOGO_SRC = `${BASE_PATH}/profitscope-logo.png`;

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

const initialAnnualStatement: FinancialStatement = createEmptyAnnualStatement();

const initialPreviousAnnualStatement: FinancialStatement = (() => {
  const parsed = safeParseFinancialStatement(samplePreviousAnnualStatement);
  return parsed.success ? parsed.data : createEmptyAnnualStatement();
})();

const initialMonthlyStatement: MonthlyFinancialStatement = createEmptyMonthlyStatement();

const ROI_OPTIONS: Array<{ value: RoiProfitType; label: string }> = [
  { value: "operatingIncome", label: "営業利益" },
  { value: "ordinaryIncome", label: "経常利益" },
  { value: "netIncome", label: "当期純利益" },
];

const TAX_MODE_OPTIONS: Array<{ value: TaxSettings["mode"]; label: string }> = [
  { value: "manual", label: "手入力" },
  { value: "estimated", label: "概算税率" },
];
const COST_BREAKDOWN_MODE_OPTIONS: Array<{ value: "category" | "item"; label: string }> = [
  { value: "category", label: "カテゴリ別" },
  { value: "item", label: "科目別" },
];

const roundToInteger = (value: number): number => Math.round(value);

const parseNumberInput = (value: string): number | null => {
  const normalized = value.replace(/,/g, "").trim();
  if (normalized === "" || normalized === "-") {
    return null;
  }
  const num = Number(normalized);
  return Number.isFinite(num) ? roundToInteger(num) : null;
};

const formatNumberInput = (value: string): string => {
  const trimmed = value.replace(/,/g, "").trim();
  if (trimmed === "") {
    return "";
  }
  const sign = trimmed.startsWith("-") ? "-" : "";
  const digits = trimmed.replace(/[^0-9]/g, "");
  if (digits === "") {
    return sign;
  }
  return `${sign}${Number(digits).toLocaleString("ja-JP")}`;
};

const sanitizeAmount = (value: number | null): number => {
  if (value === null || !Number.isFinite(value)) {
    return 0;
  }

  return roundToInteger(value);
};

const formatPromptPercent = (value: number | null): string => {
  if (value === null || Number.isNaN(value)) {
    return "-";
  }
  return `${value.toFixed(2)}%`;
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

const ensureTaxItem = (items: AccountItem[]): AccountItem[] => {
  const hasTax = items.some((item) => item.category === "tax");
  if (hasTax) {
    return items;
  }

  return [
    ...items,
    {
      id: "tax-import-default",
      name: "法人税等",
      category: "tax",
      amount: 0,
    },
  ];
};

const ensureMonthlyTaxItem = (items: MonthlyFinancialStatement["items"]): MonthlyFinancialStatement["items"] => {
  const hasTax = items.some((item) => item.category === "tax");
  if (hasTax) {
    return items;
  }

  return [
    ...items,
    {
      id: "tax-monthly-import-default",
      name: "法人税等",
      category: "tax",
      monthlyAmounts: Array.from({ length: 12 }, (_, index) => ({
        month: (index + 1) as MonthlyAmount["month"],
        amount: 0,
      })),
    },
  ];
};

const withConsumptionTaxAmount = (items: AccountItem[], consumptionTaxAmount: number): AccountItem[] => {
  const normalized = roundToInteger(Math.max(0, consumptionTaxAmount));
  const consumptionTaxId = "consumption-tax-manual";
  const next = items.filter((item) => item.id !== consumptionTaxId);

  if (normalized <= 0) {
    return next;
  }

  return [
    ...next,
    {
      id: consumptionTaxId,
      name: "消費税（手入力）",
      category: "sga",
      amount: normalized,
    },
  ];
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
  const router = useRouter();
  const [annualInput, setAnnualInput] = useState<FinancialStatement>(initialAnnualStatement);
  const [monthlyInput, setMonthlyInput] = useState<MonthlyFinancialStatement>(initialMonthlyStatement);
  const previousAnnualInput: FinancialStatement = initialPreviousAnnualStatement;
  const [roiProfitType, setRoiProfitType] = useState<RoiProfitType>("operatingIncome");
  const [taxMode, setTaxMode] = useState<TaxSettings["mode"]>("manual");
  const [isConsumptionTaxManual, setIsConsumptionTaxManual] = useState<boolean>(false);
  const [consumptionTaxAmount, setConsumptionTaxAmount] = useState<number>(0);
  const [consumptionTaxAmountText, setConsumptionTaxAmountText] = useState<string>("0");
  const [costBreakdownMode, setCostBreakdownMode] = useState<"category" | "item">("category");
  const [estimatedTaxRate, setEstimatedTaxRate] = useState<number>(30);
  const [importMessage, setImportMessage] = useState<string>("");
  const [aiPromptText, setAiPromptText] = useState<string>("");
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [hasLoadedServerState, setHasLoadedServerState] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [persistErrorMessage, setPersistErrorMessage] = useState<string>("");
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);

  useEffect(() => {
    if (IS_GITHUB_PAGES) {
      setIsCheckingAuth(false);
      return;
    }

    let isMounted = true;

    const verifyAuth = async (): Promise<void> => {
      try {
        const me = await fetchMe();
        if (isMounted && !me.authenticated) {
          router.replace("/login");
          return;
        }
      } catch {
        if (isMounted) {
          setPersistErrorMessage("認証確認に失敗しました。再度ログインしてください。");
          router.replace("/login");
          return;
        }
      } finally {
        if (isMounted) {
          setIsCheckingAuth(false);
        }
      }
    };

    void verifyAuth();

    return () => {
      isMounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (isCheckingAuth || IS_GITHUB_PAGES) {
      setHasLoadedServerState(true);
      setIsInitialLoading(false);
      return;
    }

    let isMounted = true;

    const load = async (): Promise<void> => {
      try {
        const response = await fetchLatestStatement();
        const parsed =
          response && typeof response === "object" && "data" in response
            ? (response as { data?: unknown }).data
            : response;

        const state = (parsed ?? {}) as Partial<DashboardPersistedState>;

        const parsedAnnual = safeParseFinancialStatement(state.annualInput);
        if (parsedAnnual.success && isMounted) {
          setAnnualInput(parsedAnnual.data);
        }

        const parsedMonthly = safeParseMonthlyFinancialStatement(state.monthlyInput);
        if (parsedMonthly.success && isMounted) {
          setMonthlyInput(parsedMonthly.data);
        }

        if (
          isMounted &&
          (state.roiProfitType === "operatingIncome" ||
            state.roiProfitType === "ordinaryIncome" ||
            state.roiProfitType === "netIncome")
        ) {
          setRoiProfitType(state.roiProfitType);
        }

        if (isMounted && (state.taxMode === "manual" || state.taxMode === "estimated")) {
          setTaxMode(state.taxMode);
        }

        if (isMounted && typeof state.estimatedTaxRate === "number" && Number.isFinite(state.estimatedTaxRate)) {
          setEstimatedTaxRate(state.estimatedTaxRate);
        }

        if (isMounted && typeof state.isConsumptionTaxManual === "boolean") {
          setIsConsumptionTaxManual(state.isConsumptionTaxManual);
        }

        if (isMounted && typeof state.consumptionTaxAmount === "number" && Number.isFinite(state.consumptionTaxAmount)) {
          const normalized = roundToInteger(Math.max(0, state.consumptionTaxAmount));
          setConsumptionTaxAmount(normalized);
          setConsumptionTaxAmountText(normalized.toLocaleString("ja-JP"));
        }

        if (isMounted && (state.costBreakdownMode === "category" || state.costBreakdownMode === "item")) {
          setCostBreakdownMode(state.costBreakdownMode);
        }

        if (isMounted) {
          setPersistErrorMessage("");
        }
      } catch {
        if (isMounted) {
          setPersistErrorMessage("サーバ保存データの読込に失敗しました。入力は継続できます。");
        }
      } finally {
        if (isMounted) {
          setHasLoadedServerState(true);
          setIsInitialLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [isCheckingAuth]);

  useEffect(() => {
    if (!hasLoadedServerState || isCheckingAuth || IS_GITHUB_PAGES) {
      return;
    }

    const payload: DashboardPersistedState = {
      annualInput,
      monthlyInput,
      roiProfitType,
      taxMode,
      estimatedTaxRate,
      isConsumptionTaxManual,
      consumptionTaxAmount,
      costBreakdownMode,
    };

    let isCancelled = false;
    const timer = window.setTimeout(() => {
      const save = async (): Promise<void> => {
        if (!isCancelled) {
          setIsSaving(true);
          setPersistErrorMessage("");
        }

        try {
          await saveLatestStatement(payload);
        } catch {
          if (!isCancelled) {
            setPersistErrorMessage("サーバ保存に失敗しました。入力は継続できます。");
          }
        } finally {
          if (!isCancelled) {
            setIsSaving(false);
          }
        }
      };

      void save();
    }, 500);

    return () => {
      isCancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    annualInput,
    monthlyInput,
    roiProfitType,
    taxMode,
    estimatedTaxRate,
    isConsumptionTaxManual,
    consumptionTaxAmount,
    costBreakdownMode,
    hasLoadedServerState,
    isCheckingAuth,
  ]);

  const handleLogout = async (): Promise<void> => {
    if (IS_GITHUB_PAGES) {
      return;
    }

    try {
      await logout();
    } catch {
      // ログアウト失敗時でもログイン画面へ遷移する
    }
    router.replace("/login");
    router.refresh();
  };

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
    const withConsumptionTax = isConsumptionTaxManual
      ? { ...base, items: withConsumptionTaxAmount(base.items, consumptionTaxAmount) }
      : base;

    if (taxSettings.mode === "estimated") {
      return applyEstimatedTaxToAnnual(withConsumptionTax, taxSettings.estimatedTaxRate ?? 0);
    }

    return withConsumptionTax;
  }, [annualValidation, taxSettings, isConsumptionTaxManual, consumptionTaxAmount]);

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

  const buildAiSummaryPrompt = (): string => {
    return [
      "以下は ProfitScope の集計結果です。経営者向けに、現状分析・課題・改善アクションを具体的に提案してください。",
      "",
      `会計年度: ${annualStatementForCalc.fiscalYear}`,
      `税計算モード: ${taxMode === "manual" ? "手入力" : "概算税率"}${taxMode === "estimated" ? `（税率: ${estimatedTaxRate}%）` : ""}`,
      `消費税手入力: ${isConsumptionTaxManual ? `ON（${formatCurrency(consumptionTaxAmount)}）` : "OFF"}`,
      "",
      "【損益サマリー】",
      `売上高: ${formatCurrency(annualSummary.revenue)}`,
      `総費用: ${formatCurrency(annualSummary.totalCost)}`,
      `売上総利益: ${formatCurrency(annualSummary.grossProfit)}`,
      `営業利益: ${formatCurrency(annualSummary.operatingIncome)}`,
      `経常利益: ${formatCurrency(annualSummary.ordinaryIncome)}`,
      `税引前当期純利益: ${formatCurrency(annualSummary.pretaxIncome)}`,
      `当期純利益: ${formatCurrency(annualSummary.netIncome)}`,
      "",
      "【KPI】",
      `売上総利益率: ${formatPromptPercent(annualKpis.grossProfitMargin)}`,
      `営業利益率: ${formatPromptPercent(annualKpis.operatingMargin)}`,
      `経常利益率: ${formatPromptPercent(annualKpis.ordinaryMargin)}`,
      `当期純利益率: ${formatPromptPercent(annualKpis.netMargin)}`,
      `費用率: ${formatPromptPercent(annualKpis.costRatio)}`,
      `ROI: ${formatPromptPercent(annualRoi.roi)}`,
      "",
      "【前年比】",
      `売上高前年比: ${formatPercent(yoy.revenue)}`,
      `営業利益前年比: ${formatPercent(yoy.operatingIncome)}`,
      `当期純利益前年比: ${formatPercent(yoy.netIncome)}`,
      "",
      "希望する出力形式:",
      "1. 全体所見（3点）",
      "2. 問題の根本原因（数値根拠つき）",
      "3. すぐ実行できる施策（短期3つ）",
      "4. 中期施策（3か月）",
      "5. モニタリングすべきKPIと目標値",
    ].join("\n");
  };

  const handleGenerateAiPrompt = async (): Promise<void> => {
    const prompt = buildAiSummaryPrompt();
    setAiPromptText(prompt);
    try {
      await navigator.clipboard.writeText(prompt);
      setImportMessage("AI連携用プロンプトを生成し、クリップボードへコピーしました。");
    } catch {
      setImportMessage("AI連携用プロンプトを生成しました。下欄からコピーしてください。");
    }
  };

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

  const handleLedgerCsvImport = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const content = await file.text();
      const imported = parseLedgerCsv(content, {
        fiscalYearStartMonth: FISCAL_PERIOD_START_MONTH,
        fiscalYearLabel: "end",
      });

      if (imported.items.length === 0) {
        setImportMessage(
          "取込対象がありません。列名は「日付, 勘定科目, 摘要, OUT（出金）またはOUT, IN（入金）またはIN」を使用してください。",
        );
        event.target.value = "";
        return;
      }

      setAnnualInput((prev) => ({
        ...prev,
        fiscalYear: imported.fiscalYear ?? prev.fiscalYear,
        items: ensureTaxItem(imported.items),
      }));
      setMonthlyInput((prev) => ({
        ...prev,
        fiscalYear: imported.fiscalYear ?? prev.fiscalYear,
        items:
          imported.monthlyItems.length > 0
            ? ensureMonthlyTaxItem(imported.monthlyItems)
            : ensureMonthlyTaxItem(prev.items),
      }));

      setImportMessage(
        `${imported.items.length}件の勘定科目を取込みました（月次推移にも反映）。必要に応じてカテゴリを確認してください。`,
      );
    } catch {
      setImportMessage("CSVの読み込みに失敗しました。ファイル形式を確認してください。");
    } finally {
      event.target.value = "";
    }
  };

  const handleClearAll = (): void => {
    setAnnualInput(createEmptyAnnualStatement());
    setMonthlyInput(createEmptyMonthlyStatement());
    setRoiProfitType("operatingIncome");
    setTaxMode("manual");
    setIsConsumptionTaxManual(false);
    setConsumptionTaxAmount(0);
    setConsumptionTaxAmountText("0");
    setCostBreakdownMode("category");
    setEstimatedTaxRate(30);
    setImportMessage("入力内容を0ベースの空データにクリアしました。");
  };

  if (isCheckingAuth) {
    return (
      <main className="min-h-screen bg-sky-50/60 px-4 py-6 md:px-8 lg:px-10">
        <div className="mx-auto w-full max-w-7xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-600">認証状態を確認しています...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-sky-50/60 px-4 py-6 md:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Image
                src={LOGO_SRC}
                alt="ProfitScope"
                width={420}
                height={90}
                className="h-[90px] w-auto"
                priority
              />
              <h1 className="mt-2 text-2xl font-bold text-slate-900">ProfitScope ダッシュボード</h1>
              <p className="mt-1 text-sm text-slate-600">
                会計年度 {annualStatementForCalc.fiscalYear} の財務状況をリアルタイムで可視化
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Link
                href="/how-to-use"
                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-center text-sm text-slate-700 hover:bg-slate-100"
              >
                使い方を見る
              </Link>
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
              {!IS_GITHUB_PAGES ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-center text-sm text-slate-700 hover:bg-slate-100"
                >
                  ログアウト
                </button>
              ) : null}

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
                <button
                  type="button"
                  onClick={() => setIsConsumptionTaxManual((prev) => !prev)}
                  className={`mt-2 rounded-md border px-3 py-2 ${
                    isConsumptionTaxManual
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  消費税手入力
                </button>
                {isConsumptionTaxManual ? (
                  <label className="mt-2 block text-sm text-slate-700">
                    消費税（円）
                    <input
                      type="text"
                      inputMode="numeric"
                      value={consumptionTaxAmountText}
                      onChange={(event) => {
                        const formatted = formatNumberInput(event.target.value);
                        setConsumptionTaxAmountText(formatted);
                        const parsed = parseNumberInput(formatted);
                        setConsumptionTaxAmount(Math.max(0, sanitizeAmount(parsed)));
                      }}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                    />
                  </label>
                ) : null}
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
            <label className="cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
              仕訳CSV取込（日付/勘定科目/摘要/OUT/IN）
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleLedgerCsvImport}
                className="hidden"
              />
            </label>
            <button
              type="button"
              onClick={handleClearAll}
              className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 hover:bg-rose-100"
            >
              内容クリア
            </button>
          </div>
          {importMessage ? <p className="mt-2 text-xs text-slate-600">{importMessage}</p> : null}
          {isInitialLoading ? <p className="mt-1 text-xs text-slate-500">保存データを読込中です...</p> : null}
          {isSaving ? <p className="mt-1 text-xs text-slate-500">保存中...</p> : null}
          {persistErrorMessage ? <p className="mt-1 text-xs text-rose-600">{persistErrorMessage}</p> : null}

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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900">費用内訳</h2>
              <div className="flex flex-wrap gap-2">
                {COST_BREAKDOWN_MODE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setCostBreakdownMode(option.value)}
                    className={`rounded-md border px-2 py-1 text-xs ${
                      costBreakdownMode === option.value
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-300 bg-white text-slate-700"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-slate-500">売上原価・販管費・営業外費用・特別損失・法人税等</p>
            <CostBreakdownChart summary={annualSummary} items={annualStatementForCalc.items} mode={costBreakdownMode} />
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">損益ウォーターフォール</h2>
            <p className="text-xs text-slate-500">売上から当期純利益までの増減を表示</p>
            <ProfitWaterfallChart summary={annualSummary} />
          </article>
        </section>

        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">月次推移</h2>
          <p className="text-xs text-slate-500">売上高・営業利益・当期純利益（決算期順）</p>
          <MonthlyTrendChart monthly={monthlyResults} fiscalYearStartMonth={FISCAL_PERIOD_START_MONTH} />
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

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">AI連携用プロンプト</h2>
            <button
              type="button"
              onClick={handleGenerateAiPrompt}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              サマリーからプロンプト生成
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            生成時に自動コピーを試行します。失敗した場合は下のテキストを手動コピーしてください。
          </p>
          <textarea
            readOnly
            value={aiPromptText}
            className="mt-3 h-64 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-700"
            placeholder="「サマリーからプロンプト生成」を押すと、AIに渡せる文章をここに表示します。"
          />
        </section>
      </div>
    </main>
  );
}
