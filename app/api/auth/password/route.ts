import { NextResponse } from "next/server";
import { z } from "zod";

import { changePasswordByUserId, getUserByCookie } from "@/lib/auth/session";
import { getD1Config } from "@/lib/db/cloudflareD1";

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  currentPassword: z.string().min(1, "現在のパスワードを入力してください。"),
  newPassword: z.string().min(8, "新しいパスワードは8文字以上で入力してください。"),
});

const DB_NOT_CONFIGURED_MESSAGE =
  "Cloudflare D1の接続情報が未設定です。Workers の DB binding または D1 API 接続設定を確認してください。";

export const POST = async (request: Request): Promise<Response> => {
  const config = getD1Config();

  try {
    const user = await getUserByCookie(config, request.headers.get("cookie"));
    if (!user) {
      return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = inputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "入力が不正です。" }, { status: 400 });
    }

    await changePasswordByUserId(config, user.userId, parsed.data.currentPassword, parsed.data.newPassword);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "パスワード変更に失敗しました。";
    const status = message.includes("未設定")
      ? 503
      : message.includes("現在のパスワード")
        ? 400
        : 500;
    return NextResponse.json({ error: status === 503 ? DB_NOT_CONFIGURED_MESSAGE : message }, { status });
  }
};
