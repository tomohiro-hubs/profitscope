import { NextResponse } from "next/server";

import { getUserByCookie } from "@/lib/auth/session";
import { getD1Config } from "@/lib/db/cloudflareD1";
import { getLatestState, saveLatestState } from "@/lib/db/persistence";

export const dynamic = "force-dynamic";

const DB_NOT_CONFIGURED_MESSAGE =
  "Cloudflare D1の接続情報が未設定です。CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_DATABASE_ID / CLOUDFLARE_D1_API_TOKEN を設定してください。";

/**
 * 最新のダッシュボード保存データを取得する。
 */
export const GET = async (request: Request): Promise<Response> => {
  const config = getD1Config();

  if (!config) {
    return NextResponse.json({ error: DB_NOT_CONFIGURED_MESSAGE }, { status: 503 });
  }

  try {
    const user = await getUserByCookie(config, request.headers.get("cookie"));
    if (!user) {
      return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
    }

    const state = await getLatestState(config);
    return NextResponse.json({ data: state }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存データの取得に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};

/**
 * 最新のダッシュボード保存データを更新する。
 */
export const PUT = async (request: Request): Promise<Response> => {
  const config = getD1Config();

  if (!config) {
    return NextResponse.json({ error: DB_NOT_CONFIGURED_MESSAGE }, { status: 503 });
  }

  try {
    const user = await getUserByCookie(config, request.headers.get("cookie"));
    if (!user) {
      return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
    }

    const body = (await request.json()) as unknown;
    const saved = await saveLatestState(config, body);
    return NextResponse.json({ data: saved }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存データの更新に失敗しました。";
    const status =
      typeof message === "string" &&
      (message.includes("入力") || message.includes("不正") || message.includes("必須"))
        ? 400
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
};
