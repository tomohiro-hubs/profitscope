export interface MeResponse {
  authenticated: boolean;
  username?: string;
}

export const fetchMe = async (): Promise<MeResponse> => {
  const response = await fetch("/api/auth/me", {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (response.status === 401) {
    return { authenticated: false };
  }

  if (!response.ok) {
    throw new Error("認証状態の確認に失敗しました。");
  }

  return (await response.json()) as MeResponse;
};

export const login = async (username: string, password: string): Promise<void> => {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "ログインに失敗しました。");
  }
};

export const logout = async (): Promise<void> => {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("ログアウトに失敗しました。");
  }
};
