import type { AccountCategory, AccountItem, MonthNumber, MonthlyAccountItem } from "@/types";

import { inferCategoryByAccountName } from "./accountNameCategory";

export interface LedgerImportResult {
  fiscalYear: number | null;
  items: AccountItem[];
  monthlyItems: MonthlyAccountItem[];
}

export interface LedgerImportOptions {
  fiscalYearStartMonth?: number;
  fiscalYearLabel?: "start" | "end";
}

interface LedgerRow {
  date: string;
  accountName: string;
  outAmount: number;
  inAmount: number;
  month: MonthNumber | null;
  fiscalYear: number | null;
}

const REQUIRED_HEADERS = ["日付", "勘定科目", "摘要"] as const;
const OUT_HEADER_ALIASES = ["OUT（出金）", "OUT"] as const;
const IN_HEADER_ALIASES = ["IN（入金）", "IN"] as const;

function findHeaderIndex(headerIndex: Map<string, number>, aliases: readonly string[]): number {
  for (const name of aliases) {
    const index = headerIndex.get(name);
    if (typeof index === "number") {
      return index;
    }
  }
  return -1;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseNumber(value: string): number {
  const normalized = value.replace(/,/g, "").trim();
  if (normalized === "") {
    return 0;
  }
  const num = Number(normalized);
  return Number.isFinite(num) ? Math.round(num) : 0;
}

function extractYear(dateText: string): number | null {
  const match = dateText.match(/(\d{4})[\/-]/);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  return Number.isFinite(year) ? year : null;
}

function extractYearAndMonth(dateText: string): { year: number; month: number } | null {
  const match = dateText.match(/(\d{4})[\/-](\d{1,2})/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null;
  }

  return { year, month };
}

function resolveFiscalYear(dateText: string, options: Required<LedgerImportOptions>): number | null {
  const yearAndMonth = extractYearAndMonth(dateText);
  if (!yearAndMonth) {
    return extractYear(dateText);
  }

  const { year, month } = yearAndMonth;
  const isAfterFiscalStart = month >= options.fiscalYearStartMonth;

  if (options.fiscalYearLabel === "start") {
    return isAfterFiscalStart ? year : year - 1;
  }

  if (options.fiscalYearStartMonth === 1) {
    return year;
  }

  return isAfterFiscalStart ? year + 1 : year;
}

function resolveMonth(dateText: string): MonthNumber | null {
  const yearAndMonth = extractYearAndMonth(dateText);
  if (!yearAndMonth) {
    return null;
  }
  return yearAndMonth.month as MonthNumber;
}

function convertFlowToAmount(category: AccountCategory, outAmount: number, inAmount: number): number {
  if (category === "revenue" || category === "nonOpIncome" || category === "extraordinaryGain") {
    return Math.max(0, inAmount - outAmount);
  }

  if (
    category === "cogs" ||
    category === "sga" ||
    category === "nonOpExpense" ||
    category === "extraordinaryLoss" ||
    category === "tax"
  ) {
    return Math.max(0, outAmount - inAmount);
  }

  return 0;
}

/**
 * 指定フォーマットの入出金CSVを読み取り、ProfitScopeの年次勘定科目へ集計する。
 */
export function parseLedgerCsv(content: string, options?: LedgerImportOptions): LedgerImportResult {
  const importOptions: Required<LedgerImportOptions> = {
    fiscalYearStartMonth: options?.fiscalYearStartMonth ?? 1,
    fiscalYearLabel: options?.fiscalYearLabel ?? "end",
  };

  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { fiscalYear: null, items: [], monthlyItems: [] };
  }

  const header = parseCsvLine(lines[0]);
  const headerIndex = new Map<string, number>();
  header.forEach((name, index) => headerIndex.set(name, index));

  const hasAllHeaders = REQUIRED_HEADERS.every((name) => headerIndex.has(name));
  const outIndex = findHeaderIndex(headerIndex, OUT_HEADER_ALIASES);
  const inIndex = findHeaderIndex(headerIndex, IN_HEADER_ALIASES);

  if (!hasAllHeaders || outIndex < 0 || inIndex < 0) {
    return { fiscalYear: null, items: [], monthlyItems: [] };
  }

  const rows: LedgerRow[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    const date = cols[headerIndex.get("日付") ?? -1] ?? "";
    const accountName = cols[headerIndex.get("勘定科目") ?? -1] ?? "";
    const outAmount = parseNumber(cols[outIndex] ?? "");
    const inAmount = parseNumber(cols[inIndex] ?? "");
    const month = resolveMonth(date);
    const fiscalYear = resolveFiscalYear(date, importOptions);

    if (accountName.trim() === "") {
      continue;
    }

    rows.push({ date, accountName, outAmount, inAmount, month, fiscalYear });
  }

  const years = rows
    .map((row) => row.fiscalYear)
    .filter((year): year is number => year !== null);
  const fiscalYear = years.length > 0 ? Math.max(...years) : null;
  const targetRows = fiscalYear === null ? rows : rows.filter((row) => row.fiscalYear === fiscalYear);

  const aggregate = new Map<string, { name: string; category: AccountCategory; amount: number }>();
  const monthlyAggregate = new Map<string, { name: string; category: AccountCategory; monthly: Map<number, number> }>();

  for (const row of targetRows) {
    const category = inferCategoryByAccountName(row.accountName) ?? "exclude";
    const amount = convertFlowToAmount(category, row.outAmount, row.inAmount);
    const key = `${row.accountName}::${category}`;

    const current = aggregate.get(key);
    if (!current) {
      aggregate.set(key, {
        name: row.accountName,
        category,
        amount,
      });
    } else {
      current.amount = Math.round(current.amount + amount);
    }

    const monthlyCurrent = monthlyAggregate.get(key);
    if (!monthlyCurrent) {
      monthlyAggregate.set(key, {
        name: row.accountName,
        category,
        monthly: new Map<number, number>(row.month ? [[row.month, amount]] : []),
      });
      continue;
    }

    if (row.month) {
      const previous = monthlyCurrent.monthly.get(row.month) ?? 0;
      monthlyCurrent.monthly.set(row.month, Math.round(previous + amount));
    }
  }

  const items: AccountItem[] = Array.from(aggregate.values()).map((entry, index) => ({
    id: `import-${index + 1}`,
    name: entry.name,
    category: entry.category,
    amount: entry.amount,
  }));

  const monthlyItems: MonthlyAccountItem[] = Array.from(monthlyAggregate.values()).map((entry, index) => ({
    id: `import-monthly-${index + 1}`,
    name: entry.name,
    category: entry.category,
    monthlyAmounts: Array.from({ length: 12 }, (_, monthIndex) => {
      const month = (monthIndex + 1) as MonthNumber;
      return {
        month,
        amount: Math.round(entry.monthly.get(month) ?? 0),
      };
    }),
  }));

  return { fiscalYear, items, monthlyItems };
}
