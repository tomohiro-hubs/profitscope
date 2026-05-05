"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { login } from "@/lib/client/auth";

export default function LoginPage(): React.JSX.Element {
  const router = useRouter();
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      await login(username.trim(), password);
      router.push("/");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "ログインに失敗しました。";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-sky-50/60 px-4 py-6">
      <section className="mx-auto mt-10 w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">ProfitScope ログイン</h1>
        <p className="mt-1 text-sm text-slate-600">ダッシュボードを利用するにはログインしてください。</p>
        <form className="mt-5 grid gap-3" onSubmit={onSubmit}>
          <label className="text-sm text-slate-700">
            ユーザー名
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              autoComplete="username"
              required
            />
          </label>
          <label className="text-sm text-slate-700">
            パスワード
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              autoComplete="current-password"
              required
            />
          </label>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isSubmitting ? "ログイン中..." : "ログイン"}
          </button>
          {errorMessage ? <p className="text-sm text-rose-600">{errorMessage}</p> : null}
        </form>
      </section>
    </main>
  );
}
