import { NextResponse } from "next/server";
import { z } from "zod";

import { getD1Config } from "@/lib/db/cloudflareD1";
import { buildLoginCookie, loginWithPassword } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const loginInputSchema = z.object({
  username: z.string().min(1, "ユーザー名を入力してください。"),
  password: z.string().min(1, "パスワードを入力してください。"),
});

const DB_NOT_CONFIGURED_MESSAGE =
  "Cloudflare D1の接続情報が未設定です。CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_DATABASE_ID / CLOUDFLARE_D1_API_TOKEN を設定してください。";

export const POST = async (request: Request): Promise<Response> => {
  const config = getD1Config();
  if (!config) {
    return NextResponse.json({ error: DB_NOT_CONFIGURED_MESSAGE }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = loginInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "入力が不正です。" }, { status: 400 });
    }

    const token = await loginWithPassword(config, parsed.data.username, parsed.data.password);
    if (!token) {
      return NextResponse.json({ error: "ユーザー名またはパスワードが違います。" }, { status: 401 });
    }

    return NextResponse.json(
      { ok: true },
      {
        status: 200,
        headers: {
          "Set-Cookie": buildLoginCookie(token),
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "ログイン処理に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
