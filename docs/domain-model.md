# ProfitScope ドメインモデル定義

## 1. ドメインモデル
型の正規定義は `/types/index.ts` を参照する。

- `AccountCategory`: 会計カテゴリ。
  - `revenue`, `cogs`, `sga`, `nonOpIncome`, `nonOpExpense`, `extraordinaryGain`, `extraordinaryLoss`, `tax`
- `AccountItem`: 年次入力の勘定科目。
- `MonthlyAccountItem`: 月次入力の勘定科目。
- `FinancialStatement`: 年次財務データ。
- `MonthlyFinancialStatement`: 月次財務データ。
- `ProfitAndLossSummary`: 損益段階の計算結果。
- `KpiMetrics`: 各利益率・費用率・ROI。
- `RoiProfitType`: ROI の利益定義(`operatingIncome` / `ordinaryIncome` / `netIncome`)。
- `DashboardData`: ダッシュボード最終出力。
- `PersistedFinancialStatement`: D1 永続化済みの財務データ（`id`, `createdAt`, `updatedAt` を含む）。
- `PersistedAccountItem`: D1 永続化済みの勘定科目データ（`statementId` 外部キーを含む）。

## 2. 会計計算順序(厳守)
1. 売上高(`revenue`)
2. 売上原価(`cogs`)
3. 売上総利益 = 売上高 - 売上原価
4. 販管費(`sga`)
5. 営業利益 = 売上総利益 - 販管費
6. 営業外収益(`nonOpIncome`) / 営業外費用(`nonOpExpense`)
7. 経常利益 = 営業利益 + 営業外収益 - 営業外費用
8. 特別利益(`extraordinaryGain`) / 特別損失(`extraordinaryLoss`)
9. 税引前当期純利益 = 経常利益 + 特別利益 - 特別損失
10. 法人税等(`tax`)
11. 当期純利益 = 税引前当期純利益 - 法人税等

## 3. KPI と ROI 定義
- 売上総利益率(%) = 売上総利益 / 売上高 * 100
- 営業利益率(%) = 営業利益 / 売上高 * 100
- 経常利益率(%) = 経常利益 / 売上高 * 100
- 当期純利益率(%) = 当期純利益 / 売上高 * 100
- 費用率(%) = 総費用 / 売上高 * 100
- ROI(%) = 選択利益 / 投下資本 * 100

分母が 0 の場合は `null` を返す。UI は `-` を表示する。

## 4. 税計算方針
- 初期実装は `tax` をユーザー直接入力とする(`TaxSettings.mode = "manual"`)。
- 概算税率を使う場合は `TaxSettings.mode = "estimated"` とし、税率は設定値(`estimatedTaxRate`)から読み込む。
- 税率のハードコードは禁止。

## 5. バリデーション境界
- `validation` レイヤーで `null` / `undefined` / `NaN` / 数値以外を排除する。
- 金額は円単位の整数を前提とし、必要に応じて正規化する。
- 異常値(例: マイナス売上)は仕様に従って許容可否を明示し、エラー文言でユーザーに通知する。
- `accounting` と `finance` は検証済みデータのみを受け取り、副作用を持たない純粋関数として実装する。

## 6. 永続化モデル（Cloudflare D1）
### 6.1 テーブル定義
- `financial_statements`
  - `id`: INTEGER PK
  - `fiscal_year`: INTEGER（会計年度）
  - `invested_capital`: INTEGER（投下資本、円単位）
  - `created_at`: TEXT（ISO8601 互換）
  - `updated_at`: TEXT（ISO8601 互換）
- `account_items`
  - `id`: TEXT PK
  - `statement_id`: INTEGER FK -> `financial_statements.id`
  - `name`: TEXT（勘定科目名）
  - `category`: TEXT（`AccountCategory`）
  - `amount`: INTEGER（円単位）

### 6.2 マッピング方針
- `FinancialStatement.fiscalYear` -> `financial_statements.fiscal_year`
- `FinancialStatement.investedCapital` -> `financial_statements.invested_capital`
- `FinancialStatement.items[]` -> `account_items`（`statement_id` で親子関連付け）
- 取得時は D1 レコードを再構成して `FinancialStatement` 互換へ戻す。

### 6.3 永続化エラーハンドリング
- D1 バインディング未設定（例: `DB` 不在）は設定エラーとして扱う。
- SQL 実行失敗は永続化エラーとして扱い、API レイヤーで 5xx を返却する。
