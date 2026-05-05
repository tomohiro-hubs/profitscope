import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "../lib/auth/password";
import { AUTH_COOKIE_NAME, buildLoginCookie, buildLogoutCookie } from "../lib/auth/session";

describe("認証ユーティリティ", () => {
  it("同一条件のハッシュが照合できる", () => {
    const password = "eicoh0051";
    const salt = "4267427585406c6cff6814328974bb88";
    const iterations = 100000;
    const hash = hashPassword(password, salt, iterations);

    expect(verifyPassword(password, salt, iterations, hash)).toBe(true);
    expect(verifyPassword("wrong-password", salt, iterations, hash)).toBe(false);
  });

  it("ログイン用Cookieが生成される", () => {
    const cookie = buildLoginCookie("token123");
    expect(cookie).toContain(`${AUTH_COOKIE_NAME}=token123`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Max-Age=");
  });

  it("ログアウト用Cookieが生成される", () => {
    const cookie = buildLogoutCookie();
    expect(cookie).toContain(`${AUTH_COOKIE_NAME}=`);
    expect(cookie).toContain("Max-Age=0");
  });
});
