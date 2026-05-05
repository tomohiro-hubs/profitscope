import { pbkdf2Sync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 32;
const DIGEST = "sha256";

/**
 * 平文パスワードを PBKDF2 でハッシュ化する。
 */
export const hashPassword = (password: string, salt: string, iterations: number): string => {
  return pbkdf2Sync(password, salt, iterations, KEY_LENGTH, DIGEST).toString("hex");
};

/**
 * 平文パスワードと保存済みハッシュを照合する。
 */
export const verifyPassword = (
  password: string,
  salt: string,
  iterations: number,
  expectedHashHex: string,
): boolean => {
  const hashHex = hashPassword(password, salt, iterations);
  const expected = Buffer.from(expectedHashHex, "hex");
  const actual = Buffer.from(hashHex, "hex");
  if (expected.length !== actual.length) {
    return false;
  }
  return timingSafeEqual(expected, actual);
};
