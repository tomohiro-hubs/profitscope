import { z } from "zod";

const d1ApiResponseSchema = z.object({
  success: z.boolean(),
  errors: z.array(z.object({ message: z.string() })).optional(),
  result: z
    .array(
      z.object({
        success: z.boolean(),
        meta: z.record(z.unknown()).optional(),
        results: z.array(z.record(z.unknown())).optional(),
      }),
    )
    .optional(),
});

export interface D1Config {
  accountId: string;
  databaseId: string;
  apiToken: string;
}

/**
 * 環境変数から Cloudflare D1 接続設定を取得する。
 * 未設定時は null を返し、呼び出し側で 503 を返却する。
 */
export const getD1Config = (): D1Config | null => {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_DATABASE_ID;
  const apiToken = process.env.CLOUDFLARE_D1_API_TOKEN;

  if (!accountId || !databaseId || !apiToken) {
    return null;
  }

  return { accountId, databaseId, apiToken };
};

/**
 * Cloudflare D1 HTTP API に SQL を送信し、行データを返す。
 */
export const queryD1 = async (
  config: D1Config,
  sql: string,
  params: ReadonlyArray<string | number | null> = [],
): Promise<Array<Record<string, unknown>>> => {
  const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/d1/database/${config.databaseId}/query`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`D1 API呼び出しに失敗しました: HTTP ${response.status}`);
  }

  const json = await response.json();
  const parsed = d1ApiResponseSchema.safeParse(json);

  if (!parsed.success) {
    throw new Error("D1 APIレスポンス形式が不正です。");
  }

  if (!parsed.data.success) {
    const message = parsed.data.errors?.[0]?.message ?? "D1 APIエラーが発生しました。";
    throw new Error(message);
  }

  const firstResult = parsed.data.result?.[0];
  if (!firstResult || !firstResult.success) {
    throw new Error("D1クエリ実行に失敗しました。");
  }

  return firstResult.results ?? [];
};
