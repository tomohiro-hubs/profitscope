import type { AccountCategory } from "@/types";

const ACCOUNT_NAME_CATEGORY_RULES: Array<{ keywords: string[]; category: AccountCategory }> = [
  { keywords: ["売上", "売上金"], category: "revenue" },
  { keywords: ["受取利息"], category: "nonOpIncome" },
  { keywords: ["仕入"], category: "cogs" },
  { keywords: ["法人税"], category: "tax" },
  {
    keywords: [
      "外注費",
      "給料",
      "交際費",
      "会議費",
      "雑費",
      "消耗品費",
      "支払手数料",
      "支払報酬",
      "保険料",
      "減価償却費",
      "地代家賃",
      "通信費",
      "車両費",
      "新聞図書費",
      "荷造運賃",
      "広告宣伝費",
      "旅費交通費",
      "福利厚生費",
      "修繕費",
      "水道光熱費",
      "租税公課",
    ],
    category: "sga",
  },
  {
    keywords: [
      "売掛金",
      "買掛金",
      "借入金",
      "預り金",
      "立替金",
      "未払金",
      "仮払金",
      "普通預金",
      "現金",
      "役員借入金",
      "生命保険",
    ],
    category: "exclude",
  },
];

/**
 * 既存の勘定科目名からProfitScopeカテゴリを推定する。
 * 一致しない場合は null を返す。
 */
export function inferCategoryByAccountName(name: string): AccountCategory | null {
  const normalized = name.replace(/[\s　]/g, "");

  if (normalized.length === 0) {
    return null;
  }

  for (const rule of ACCOUNT_NAME_CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return rule.category;
    }
  }

  return null;
}
