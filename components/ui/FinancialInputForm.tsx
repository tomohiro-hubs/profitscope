import React, { useMemo, useState } from "react";
import { inferCategoryByAccountName } from "@/lib/accounting";
import type { AccountCategory, AccountItem } from "@/types";

export interface FinancialInputFormProps {
  fiscalYear: number;
  investedCapital: number | null;
  items: AccountItem[];
  onFiscalYearChange: (year: number) => void;
  onInvestedCapitalChange: (value: number | null) => void;
  onAddItem: (input: { name: string; category: AccountCategory; amount: number | null }) => void;
  onUpdateItem: (itemId: string, input: { name: string; category: AccountCategory; amount: number | null }) => void;
  onDeleteItem: (itemId: string) => void;
}

const CATEGORY_OPTIONS: Array<{ value: AccountCategory; label: string }> = [
  { value: "revenue", label: "売上高" },
  { value: "cogs", label: "売上原価" },
  { value: "sga", label: "販管費" },
  { value: "nonOpIncome", label: "営業外収益" },
  { value: "nonOpExpense", label: "営業外費用" },
  { value: "extraordinaryGain", label: "特別利益" },
  { value: "extraordinaryLoss", label: "特別損失" },
  { value: "tax", label: "法人税等" },
  { value: "exclude", label: "損益対象外(B/S・資金移動)" },
];

const ACCOUNT_NAME_OPTIONS: string[] = [
  "売掛金",
  "売上",
  "受取利息",
  "買掛金",
  "借入金",
  "会議費",
  "外注費",
  "給与手当",
  "現金",
  "交際費",
  "広告宣伝費",
  "預金",
  "仕入",
  "消耗品費",
  "支払手数料",
  "支払報酬料",
  "支払利息",
  "修繕費",
  "水道光熱費",
  "租税公課",
  "その他",
  "生活費",
  "地代家賃",
  "通信費",
  "荷造運賃",
  "普通預金",
  "福利厚生費",
  "法定福利費",
  "旅費交通費",
];

interface DraftItem {
  name: string;
  category: AccountCategory;
  amountText: string;
}

const parseAmount = (value: string): number | null => {
  const normalized = value.replace(/,/g, "").trim();
  if (normalized === "" || normalized === "-") {
    return null;
  }

  const num = Number(normalized);
  return Number.isFinite(num) ? Math.trunc(num) : null;
};

const normalizeAmountText = (value: string): string => {
  const trimmed = value.replace(/,/g, "").trim();
  if (trimmed === "") {
    return "";
  }

  const sign = trimmed.startsWith("-") ? "-" : "";
  const digits = trimmed.replace(/[^0-9]/g, "");
  if (digits === "") {
    return sign;
  }

  const formatted = Number(digits).toLocaleString("ja-JP");
  return `${sign}${formatted}`;
};

const applyAutoCategory = (name: string, fallback: AccountCategory): AccountCategory =>
  inferCategoryByAccountName(name) ?? fallback;

/** 財務入力フォーム。勘定科目の追加・編集・削除 UI を提供する。 */
export function FinancialInputForm({
  fiscalYear,
  investedCapital,
  items,
  onFiscalYearChange,
  onInvestedCapitalChange,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
}: FinancialInputFormProps): React.JSX.Element {
  const [draft, setDraft] = useState<DraftItem>({
    name: ACCOUNT_NAME_OPTIONS[0] ?? "",
    category: applyAutoCategory(ACCOUNT_NAME_OPTIONS[0] ?? "", "revenue"),
    amountText: "",
  });
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const editingItem = useMemo(() => items.find((item) => item.id === editingItemId) ?? null, [items, editingItemId]);

  const handleAdd = (): void => {
    if (draft.name.trim() === "") {
      return;
    }

    onAddItem({
      name: draft.name.trim(),
      category: draft.category,
      amount: parseAmount(draft.amountText),
    });

    setDraft({
      name: ACCOUNT_NAME_OPTIONS[0] ?? "",
      category: applyAutoCategory(ACCOUNT_NAME_OPTIONS[0] ?? "", draft.category),
      amountText: "",
    });
  };

  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">財務データ入力</h2>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">会計年度</span>
          <input
            type="number"
            value={fiscalYear}
            onChange={(event) => onFiscalYearChange(Number(event.target.value))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">投下資本 (円)</span>
          <input
            type="text"
            inputMode="numeric"
            value={investedCapital === null ? "" : investedCapital.toLocaleString("ja-JP")}
            onChange={(event) => onInvestedCapitalChange(parseAmount(event.target.value))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            placeholder="例: 10000000"
          />
        </label>
      </div>
      <p className="text-xs text-slate-500">決算期は 6/1〜5/31（会計年度は期末年）です。会計年度は上記入力で変更できます。</p>

      <div className="rounded-md border border-slate-200 p-3">
        <h3 className="text-sm font-medium text-slate-800">勘定科目を追加</h3>
        <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-4">
          <select
            value={draft.name}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                name: event.target.value,
                category: applyAutoCategory(event.target.value, prev.category),
              }))
            }
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {ACCOUNT_NAME_OPTIONS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={draft.category}
            onChange={(event) => setDraft((prev) => ({ ...prev, category: event.target.value as AccountCategory }))}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            inputMode="numeric"
            value={draft.amountText}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                amountText: normalizeAmountText(event.target.value),
              }))
            }
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="金額(円)"
          />
          <button
            type="button"
            onClick={handleAdd}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            追加
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-500">
        科目名に応じてカテゴリは自動推定されます。売掛金・借入金・預金などは「損益対象外」を選択してください。
      </p>
      <p className="text-xs text-amber-700">
        注意: この欄は年次入力です。ここで入力した金額は月次推移グラフには直接反映されません。
      </p>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left font-medium">科目名</th>
              <th className="px-3 py-2 text-left font-medium">カテゴリ</th>
              <th className="px-3 py-2 text-right font-medium">金額(円)</th>
              <th className="px-3 py-2 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const isEditing = editingItemId === item.id;

              return (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <select
                        value={item.name}
                        onChange={(event) => {
                          const name = event.target.value;
                          onUpdateItem(item.id, {
                            name,
                            category: applyAutoCategory(name, item.category),
                            amount: item.amount,
                          });
                        }}
                        className="w-full rounded-md border border-slate-300 px-2 py-1"
                      >
                        {ACCOUNT_NAME_OPTIONS.includes(item.name) ? null : (
                          <option value={item.name}>{item.name}</option>
                        )}
                        {ACCOUNT_NAME_OPTIONS.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      item.name
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <select
                        defaultValue={item.category}
                        onChange={(event) => {
                          const category = event.target.value as AccountCategory;
                          onUpdateItem(item.id, { name: item.name, category, amount: item.amount });
                        }}
                        className="rounded-md border border-slate-300 px-2 py-1"
                      >
                        {CATEGORY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      CATEGORY_OPTIONS.find((option) => option.value === item.category)?.label ?? "-"
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {isEditing ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        value={item.amount.toLocaleString("ja-JP")}
                        onChange={(event) => {
                          const amount = parseAmount(event.target.value);
                          onUpdateItem(item.id, { name: item.name, category: item.category, amount });
                        }}
                        className="w-32 rounded-md border border-slate-300 px-2 py-1 text-right"
                      />
                    ) : (
                      new Intl.NumberFormat("ja-JP").format(item.amount)
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingItemId((prev) => (prev === item.id ? null : item.id))}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700"
                      >
                        {isEditing ? "編集終了" : "編集"}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteItem(item.id)}
                        className="rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-600"
                      >
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-5 text-center text-slate-500">
                  勘定科目がありません
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {editingItem ? <p className="text-xs text-slate-500">編集中: {editingItem.name}</p> : null}
    </section>
  );
}
