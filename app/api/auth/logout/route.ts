import { NextResponse } from "next/server";

import { getD1Config } from "@/lib/db/cloudflareD1";
import { buildLogoutCookie, deleteSessionByCookie } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const DB_NOT_CONFIGURED_MESSAGE =
  "Cloudflare D1の接続情報が未設定です。Workers の DB binding または D1 API 接続設定を確認してください。";

export const POST = async (request: Request): Promise<Response> => {
  const config = getD1Config();

  try {
    await deleteSessionByCookie(config, request.headers.get("cookie"));
    return NextResponse.json(
      { ok: true },
      {
        status: 200,
        headers: {
          "Set-Cookie": buildLogoutCookie(),
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "ログアウト処理に失敗しました。";
    const status = message.includes("未設定") ? 503 : 500;
    return NextResponse.json({ error: status === 503 ? DB_NOT_CONFIGURED_MESSAGE : message }, { status });
  }
};
