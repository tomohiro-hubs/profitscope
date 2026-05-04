import React from "react";
import type { AccountCategory, AccountItem } from "@/types";

export interface AccountItemTableRow extends Pick<AccountItem, "id" | "name" | "category"> {
  amount: number | null;
}

export interface AccountItemTableProps {
  items: AccountItemTableRow[];
  onEdit?: (itemId: string) => void;
  onDelete?: (itemId: string) => void;
}

const CATEGORY_LABELS: Record<AccountCategory, string> = {
  revenue: "売上高",
  cogs: "売上原価",
  sga: "販管費",
  nonOpIncome: "営業外収益",
  nonOpExpense: "営業外費用",
  extraordinaryGain: "特別利益",
  extraordinaryLoss: "特別損失",
  tax: "法人税等",
};

const formatCurrency = (value: number | null): string => {
  if (value == null || Number.isNaN(value)) {
    return "-";
  }

  return `¥${new Intl.NumberFormat("ja-JP").format(value)}`;
};

/** 勘定科目の一覧テーブル。 */
export function AccountItemTable({ items, onEdit, onDelete }: AccountItemTableProps): React.JSX.Element {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-slate-600">
          <tr>
            <th className="px-4 py-3 font-medium">勘定科目</th>
            <th className="px-4 py-3 font-medium">カテゴリ</th>
            <th className="px-4 py-3 text-right font-medium">金額</th>
            <th className="px-4 py-3 text-right font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                勘定科目がありません
              </td>
            </tr>
          ) : (
            items.map((item) => {
              const isNegative = (item.amount ?? 0) < 0;

              return (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-900">{item.name}</td>
                  <td className="px-4 py-3 text-slate-700">{CATEGORY_LABELS[item.category]}</td>
                  <td className={`px-4 py-3 text-right font-medium ${isNegative ? "text-rose-600" : "text-slate-900"}`}>
                    {formatCurrency(item.amount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      {onEdit ? (
                        <button
                          type="button"
                          onClick={() => onEdit(item.id)}
                          className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          編集
                        </button>
                      ) : null}
                      {onDelete ? (
                        <button
                          type="button"
                          onClick={() => onDelete(item.id)}
                          className="rounded-md border border-rose-200 px-3 py-1 text-xs text-rose-600 hover:bg-rose-50"
                        >
                          削除
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
