import type { DashboardPersistedState } from "@/types";

const ENDPOINT = "/api/statements/latest";

export const fetchLatestStatement = async (): Promise<unknown> => {
  const response = await fetch(ENDPOINT, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`GET ${ENDPOINT} failed: ${response.status}`);
  }

  return response.json();
};

export const saveLatestStatement = async (payload: DashboardPersistedState): Promise<void> => {
  const response = await fetch(ENDPOINT, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`PUT ${ENDPOINT} failed: ${response.status}`);
  }
};
