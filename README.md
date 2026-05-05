# ProfitScope

## 1. アプリ概要
ProfitScope は、決算可視化アプリ「ProfitScope」の実装プロジェクトです。  
1年間分の勘定科目データと売上高をもとに、費用・各段階利益・税引後利益・ROI などの主要指標を計算し、経営判断に使いやすいダッシュボードとして可視化することを目的としています。  
想定ユーザーは中小企業経営者、個人事業主、経理担当者です。

## 2. 使用技術
- フレームワーク: Next.js（App Router） + TypeScript
- スタイリング: Tailwind CSS
- チャート: Recharts
- 状態管理: React 標準機能（`useState` / `useReducer` / Context）
- バリデーション: zod
- データ保存: localStorage または JSON（初期段階）
- テスト: Vitest または Jest
- パッケージマネージャ: pnpm 推奨（npm でも可）

## 3. セットアップ手順
1. リポジトリを取得します。
2. プロジェクトルートへ移動します。
3. 依存関係をインストールします。

```bash
git clone <repository-url>
cd ProfitScope
pnpm install
```

npm を使用する場合:

```bash
npm install
```

## 4. 起動手順
開発サーバーを起動します。

```bash
pnpm dev
```

npm を使用する場合:

```bash
npm run dev
```

想定確認 URL: `http://localhost:3000`

## 5. 入力項目一覧
- 会計年度（`fiscalYear`）
- 売上高（`revenue`）
- 売上原価（`cogs`）
- 販管費（`sga`）
- 営業外収益（`nonOpIncome`）
- 営業外費用（`nonOpExpense`）
- 特別利益（`extraordinaryGain`）
- 特別損失（`extraordinaryLoss`）
- 法人税等（`tax`）
- 投下資本（`investedCapital`）
- ROI 利益定義の選択（営業利益 / 経常利益 / 当期純利益）

## 6. 計算ロジック概要
ProfitScope では、以下の損益計算フローを採用します。

1. 売上総利益 = 売上高 − 売上原価
2. 営業利益 = 売上総利益 − 販管費
3. 経常利益 = 営業利益 + 営業外収益 − 営業外費用
4. 税引前当期純利益 = 経常利益 + 特別利益 − 特別損失
5. 当期純利益 = 税引前当期純利益 − 法人税等

主要指標（最低限）:
- 売上総利益率
- 営業利益率
- 経常利益率
- 当期純利益率
- 費用率
- ROI（`利益 ÷ 投下資本 × 100`）

実装方針:
- 会計ロジック・指標計算ロジックは `/lib` 配下の純粋関数として分離
- UI コンポーネント内で直接計算しない
- 内部計算は円単位の整数を基本とし、浮動小数点誤差を回避

## 7. 追加実装機能とその理由
本プロジェクトで追加実装した機能（または今後追加する拡張機能）は、経営判断の迅速化と理解容易性を目的に選定します。

- KPI サマリーカード表示
  - 理由: 重要数値を画面上部で即時把握できるため
- 費用内訳チャート
  - 理由: 費用構造の偏りや改善余地を視覚的に確認しやすいため
- 利益ウォーターフォールチャート
  - 理由: 売上から最終利益までの増減要因を段階的に追跡できるため
- ROI 利益定義切替
  - 理由: 利益観点（営業/経常/純利益）を意思決定目的に応じて比較できるため

## 8. 今後の拡張案
- 損益分岐点売上高の自動算出
- 月次推移の可視化（12か月比較）
- 前年比比較（YoY）
- 概算税率シミュレーション（税率設定値の外部管理）
- データ永続化の強化（将来的な API / DB 連携）
- CSV 入出力対応

## 9. Cloudflare D1 設定手順（永続化対応）
Cloudflare D1 を利用する場合は、以下の手順で設定します。

1. D1 データベースを作成します。

```bash
npx wrangler d1 create profitscope-db
```

2. `wrangler.toml` に D1 バインディングを設定します（例: バインディング名 `DB`）。

```toml
[[d1_databases]]
binding = "DB"
database_name = "profitscope-db"
database_id = "<Cloudflareで払い出されたdatabase_id>"
```

3. スキーマを適用します。`docs/d1-schema.sql` をマイグレーションへ配置して実行してください。

```bash
npx wrangler d1 migrations apply profitscope-db --local
npx wrangler d1 migrations apply profitscope-db --remote
```

4. 実行環境で利用する環境変数を設定します（ローカル `.dev.vars`、本番は Cloudflare ダッシュボード）。

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_DATABASE_ID`
- `CLOUDFLARE_D1_API_TOKEN`

5. API レイヤーでは入力を zod で検証したうえで D1 へ保存し、永続化失敗時は 5xx を返却します。
6. 認証は D1 の `users` / `sessions` テーブルを利用します。パスワードは PBKDF2(SHA-256) のハッシュで保存します。

## 10. 独自前提（不明点に対して置いた前提）
- リポジトリ URL は環境ごとに異なるため、セットアップ例では `<repository-url>` をプレースホルダーとして記載。
- テストランナーは AGENTS.md の方針に従い Vitest または Jest を採用可能とし、README では特定しない。
- 初期段階の保存先は localStorage または JSON を許容しつつ、永続化拡張先として Cloudflare D1 を採用する。
- 税金計算は初期実装で法人税等の直接入力を前提とし、概算税率計算はオプション扱いとする。

## 11. サブエージェント並列実装について
本プロジェクトはサブエージェント分担による並列実装を前提に進行します。  
Docs Agent はドキュメント整備（本 README を含む）を担当し、会計ロジック・UI・テストなどの他領域は担当エージェントが並列で実装します。
