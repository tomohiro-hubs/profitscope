import { NextResponse } from "next/server";

import { getD1Config } from "@/lib/db/cloudflareD1";
import { getUserByCookie } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const DB_NOT_CONFIGURED_MESSAGE =
  "Cloudflare D1の接続情報が未設定です。CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_DATABASE_ID / CLOUDFLARE_D1_API_TOKEN を設定してください。";

export const GET = async (request: Request): Promise<Response> => {
  const config = getD1Config();
  if (!config) {
    return NextResponse.json({ error: DB_NOT_CONFIGURED_MESSAGE }, { status: 503 });
  }

  try {
    const user = await getUserByCookie(config, request.headers.get("cookie"));
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    return NextResponse.json({ authenticated: true, username: user.username }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "認証状態の取得に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
