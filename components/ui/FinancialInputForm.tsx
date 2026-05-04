import React, { useMemo, useState } from "react";
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
];

interface DraftItem {
  name: string;
  category: AccountCategory;
  amountText: string;
}

const parseAmount = (value: string): number | null => {
  if (value.trim() === "") {
    return null;
  }

  const num = Number(value);
  return Number.isFinite(num) ? Math.trunc(num) : null;
};

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
  const [draft, setDraft] = useState<DraftItem>({ name: "", category: "revenue", amountText: "" });
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

    setDraft({ name: "", category: draft.category, amountText: "" });
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
            type="number"
            value={investedCapital ?? ""}
            onChange={(event) => onInvestedCapitalChange(parseAmount(event.target.value))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            placeholder="例: 10000000"
          />
        </label>
      </div>

      <div className="rounded-md border border-slate-200 p-3">
        <h3 className="text-sm font-medium text-slate-800">勘定科目を追加</h3>
        <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-4">
          <input
            type="text"
            value={draft.name}
            onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="勘定科目名"
          />
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
            type="number"
            value={draft.amountText}
            onChange={(event) => setDraft((prev) => ({ ...prev, amountText: event.target.value }))}
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
                      <input
                        type="text"
                        defaultValue={item.name}
                        onChange={(event) => {
                          const name = event.target.value;
                          onUpdateItem(item.id, { name, category: item.category, amount: item.amount });
                        }}
                        className="w-full rounded-md border border-slate-300 px-2 py-1"
                      />
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
                        type="number"
                        defaultValue={item.amount}
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
