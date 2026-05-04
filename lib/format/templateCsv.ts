/**
 * 年次入力用のCSVテンプレートを生成する。
 * Excelで文字化けしにくいようにUTF-8 BOMを付与して利用する。
 */
export function createAnnualTemplateCsv(): string {
  const rows = [
    ["fiscalYear", "investedCapital", "itemId", "itemName", "category", "amount"],
    ["2026", "10000000", "rev-1", "売上高", "revenue", "120000000"],
    ["2026", "10000000", "cogs-1", "売上原価", "cogs", "45000000"],
    ["2026", "10000000", "sga-1", "販管費", "sga", "28000000"],
    ["2026", "10000000", "nonop-inc-1", "営業外収益", "nonOpIncome", "1500000"],
    ["2026", "10000000", "nonop-exp-1", "営業外費用", "nonOpExpense", "800000"],
    ["2026", "10000000", "extra-gain-1", "特別利益", "extraordinaryGain", "300000"],
    ["2026", "10000000", "extra-loss-1", "特別損失", "extraordinaryLoss", "200000"],
    ["2026", "10000000", "tax-1", "法人税等", "tax", "9500000"],
  ];

  return rows.map((row) => row.join(",")).join("\n");
}

/**
 * 月次入力用のCSVテンプレートを生成する。
 */
export function createMonthlyTemplateCsv(): string {
  const rows: string[][] = [["fiscalYear", "investedCapital", "itemId", "itemName", "category", "month", "amount"]];

  const baseRows = [
    ["rev-1", "売上高", "revenue", "10000000"],
    ["cogs-1", "売上原価", "cogs", "3800000"],
    ["sga-1", "販管費", "sga", "2300000"],
    ["tax-1", "法人税等", "tax", "700000"],
  ] as const;

  for (let month = 1; month <= 12; month += 1) {
    for (const [itemId, itemName, category, amount] of baseRows) {
      rows.push(["2026", "10000000", itemId, itemName, category, String(month), amount]);
    }
  }

  return rows.map((row) => row.join(",")).join("\n");
}

/**
 * Excel向けにUTF-8 BOM付きCSV文字列へ変換する。
 */
export function withUtf8Bom(csv: string): string {
  return `\uFEFF${csv}`;
}
