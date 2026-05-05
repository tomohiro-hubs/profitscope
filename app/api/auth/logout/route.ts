import { NextResponse } from "next/server";

import { getD1Config } from "@/lib/db/cloudflareD1";
import { buildLogoutCookie, deleteSessionByCookie } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const DB_NOT_CONFIGURED_MESSAGE =
  "Cloudflare D1の接続情報が未設定です。CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_DATABASE_ID / CLOUDFLARE_D1_API_TOKEN を設定してください。";

export const POST = async (request: Request): Promise<Response> => {
  const config = getD1Config();
  if (!config) {
    return NextResponse.json({ error: DB_NOT_CONFIGURED_MESSAGE }, { status: 503 });
  }

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
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
