# ProfitScope アーキテクチャ

## 1. 目的
本ドキュメントは、ProfitScope(ProfitScope) の実装境界を固定し、複数エージェントが並列実装しても整合性を保てるようにするための設計契約を定義する。

## 2. 設計原則
- 会計計算と指標計算は UI から分離し、`/lib` 配下の純粋関数として実装する。
- 型契約は `/types/index.ts` を唯一の参照元とし、各レイヤーは同一型を共有する。
- 入力検証は `zod` で実施し、検証済みデータのみを計算ロジックへ渡す。
- 表示責務は `/components` と `/app` に限定し、ビジネスルールは持たせない。

## 3. 推奨ディレクトリ構成と責務
- `/types`: ドメイン型・計算結果型・UI 連携型の定義。
- `/lib/accounting`: 損益計算の純粋関数群。
- `/lib/finance`: KPI・ROI 計算の純粋関数群。
- `/lib/validation`: 入力スキーマとパース関数。
- `/lib/format`: 通貨・数値フォーマット関数。
- `/app/api`: API ルート。入力検証、永続化レイヤー呼び出し、HTTP レスポンス整形。
- `/lib/persistence`: 永続化レイヤー。Cloudflare D1 への保存・取得を担当。
- `/components/ui`: 汎用 UI コンポーネント。
- `/components/charts`: 費用内訳、ウォーターフォール、月次推移などのチャート。
- `/app`: ページ統合、状態管理、イベント処理。
- `/data`: サンプルデータ(JSON)。
- `/tests`: 会計ロジックと指標ロジックのユニットテスト。
- `/docs`: 設計・進行管理ドキュメント。

## 4. モジュール境界(インターフェース契約)
- `validation -> accounting`: `FinancialStatement` または `MonthlyFinancialStatement` を渡す。
- `accounting -> finance`: `ProfitAndLossSummary` を渡し、指標計算を行う。
- `finance -> app/components`: `KpiMetrics` と `RoiResult` を返し、表示に利用する。
- `app -> charts`: `DashboardData` とチャート向け加工済み配列を渡す。
- `app/api -> persistence`: 検証済み `FinancialStatement` を渡し、D1 永続化結果を受け取る。

### 4.1 依存方向
- 許可: `app/components -> lib/* -> types`
- 許可: `app/api -> lib/persistence -> types`
- 禁止: `types -> lib`、`lib -> app/components`、`components -> accounting実装詳細`

## 5. データフロー
1. ユーザー入力またはサンプルデータを取得する。
2. `validation` で数値・必須項目・範囲を検証する。
3. `accounting` で `ProfitAndLossSummary` を算出する。
4. `finance` で利益率・費用率・ROI を算出する。
5. `app` で `DashboardData` を組み立てる。
6. `components/ui` と `components/charts` で可視化する。
7. 保存時は `app/api` が `lib/persistence` を呼び出し、Cloudflare D1 へ永続化する。

## 6. 主要モジュール境界の実装方針
- `accounting` はカテゴリ別合計と損益段階計算のみを担当する。
- `finance` は比率計算と分母ゼロ時の `null` 制御を担当する。
- `app` は状態遷移・入力編集・再計算トリガーを担当する。
- `charts` は表示専用とし、計算式を直接保持しない。
- `persistence` は D1 SQL 実行のみを担当し、計算・表示責務を持たない。

## 7. 変更管理
- 型契約変更は Architect Agent が `/types/index.ts` を更新し、`docs/progress.md` に影響範囲を記録する。
- 仕様変更時は `docs/domain-model.md` を先に更新し、その後に実装を更新する。
