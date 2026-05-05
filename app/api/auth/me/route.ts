import { NextResponse } from "next/server";

import { getD1Config } from "@/lib/db/cloudflareD1";
import { getUserByCookie } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const DB_NOT_CONFIGURED_MESSAGE =
  "Cloudflare D1の接続情報が未設定です。Workers の DB binding または D1 API 接続設定を確認してください。";

export const GET = async (request: Request): Promise<Response> => {
  const config = getD1Config();

  try {
    const user = await getUserByCookie(config, request.headers.get("cookie"));
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    return NextResponse.json({ authenticated: true, username: user.username }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "認証状態の取得に失敗しました。";
    const status = message.includes("未設定") ? 503 : 500;
    return NextResponse.json({ error: status === 503 ? DB_NOT_CONFIGURED_MESSAGE : message }, { status });
  }
};
