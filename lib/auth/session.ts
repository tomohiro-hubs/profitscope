import { randomBytes } from "node:crypto";

import { z } from "zod";

import type { D1Config } from "@/lib/db/cloudflareD1";
import { queryD1 } from "@/lib/db/cloudflareD1";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

export const AUTH_COOKIE_NAME = "profitscope_session";

const userRowSchema = z.object({
  id: z.number(),
  username: z.string(),
  password_hash: z.string(),
  password_salt: z.string(),
  password_iterations: z.number(),
});

const sessionRowSchema = z.object({
  user_id: z.number(),
  username: z.string(),
});

const LOGIN_TTL_DAYS = 14;

const parseCookie = (cookieHeader: string | null): Record<string, string> => {
  if (!cookieHeader) {
    return {};
  }
  const entries = cookieHeader.split(";").map((part) => part.trim());
  const result: Record<string, string> = {};
  entries.forEach((entry) => {
    const idx = entry.indexOf("=");
    if (idx < 0) {
      return;
    }
    const key = entry.slice(0, idx);
    const value = entry.slice(idx + 1);
    result[key] = decodeURIComponent(value);
  });
  return result;
};

/**
 * ログイン認証を行い、成功時はセッショントークンを発行する。
 */
export const loginWithPassword = async (
  config: D1Config | null,
  username: string,
  password: string,
): Promise<string | null> => {
  const rows = await queryD1(
    config,
    "SELECT id, username, password_hash, password_salt, password_iterations FROM users WHERE username = ? LIMIT 1",
    [username],
  );

  if (rows.length === 0) {
    return null;
  }

  const parsed = userRowSchema.safeParse(rows[0]);
  if (!parsed.success) {
    throw new Error("ユーザー情報の形式が不正です。");
  }

  const valid = verifyPassword(
    password,
    parsed.data.password_salt,
    parsed.data.password_iterations,
    parsed.data.password_hash,
  );
  if (!valid) {
    return null;
  }

  const token = randomBytes(24).toString("hex");
  await queryD1(
    config,
    `INSERT INTO sessions (token, user_id, expires_at, created_at)
     VALUES (?, ?, datetime('now', '+14 days'), datetime('now'))`,
    [token, parsed.data.id],
  );

  return token;
};

/**
 * cookie からユーザーを取得し、認証状態を返す。
 */
export const getUserByCookie = async (
  config: D1Config | null,
  cookieHeader: string | null,
): Promise<{ userId: number; username: string } | null> => {
  const cookies = parseCookie(cookieHeader);
  const token = cookies[AUTH_COOKIE_NAME];
  if (!token) {
    return null;
  }

  const rows = await queryD1(
    config,
    `SELECT s.user_id, u.username
     FROM sessions s
     INNER JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND datetime(s.expires_at) > datetime('now')
     LIMIT 1`,
    [token],
  );

  if (rows.length === 0) {
    return null;
  }

  const parsed = sessionRowSchema.safeParse(rows[0]);
  if (!parsed.success) {
    throw new Error("セッション情報の形式が不正です。");
  }

  return { userId: parsed.data.user_id, username: parsed.data.username };
};

/**
 * ログアウト時にセッションを削除する。
 */
export const deleteSessionByCookie = async (config: D1Config | null, cookieHeader: string | null): Promise<void> => {
  const cookies = parseCookie(cookieHeader);
  const token = cookies[AUTH_COOKIE_NAME];
  if (!token) {
    return;
  }
  await queryD1(config, "DELETE FROM sessions WHERE token = ?", [token]);
};

export const buildLoginCookie = (token: string): string => {
  const maxAgeSeconds = LOGIN_TTL_DAYS * 24 * 60 * 60;
  return `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
};

export const buildLogoutCookie = (): string => {
  return `${AUTH_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
};

/**
 * 現在パスワードを検証し、ユーザーのパスワードを更新する。
 */
export const changePasswordByUserId = async (
  config: D1Config | null,
  userId: number,
  currentPassword: string,
  newPassword: string,
): Promise<void> => {
  const rows = await queryD1(
    config,
    "SELECT id, username, password_hash, password_salt, password_iterations FROM users WHERE id = ? LIMIT 1",
    [userId],
  );

  if (rows.length === 0) {
    throw new Error("ユーザーが存在しません。");
  }

  const parsed = userRowSchema.safeParse(rows[0]);
  if (!parsed.success) {
    throw new Error("ユーザー情報の形式が不正です。");
  }

  const currentValid = verifyPassword(
    currentPassword,
    parsed.data.password_salt,
    parsed.data.password_iterations,
    parsed.data.password_hash,
  );
  if (!currentValid) {
    throw new Error("現在のパスワードが違います。");
  }

  const iterations = 100000;
  const salt = randomBytes(16).toString("hex");
  const passwordHash = hashPassword(newPassword, salt, iterations);

  await queryD1(
    config,
    "UPDATE users SET password_hash = ?, password_salt = ?, password_iterations = ? WHERE id = ?",
    [passwordHash, salt, iterations, userId],
  );
};
