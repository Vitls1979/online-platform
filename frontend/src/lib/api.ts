import type { BalanceSnapshot } from "@/types/balance";

type LoginPayload = {
  email: string;
  password: string;
};

type LoginResponse = {
  token: string;
  name: string;
};

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unexpected error");
  }

  return response.json() as Promise<T>;
}

export async function login(payload: LoginPayload) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleResponse<LoginResponse>(response);
}

export async function fetchBalance() {
  const response = await fetch("/api/balance", {
    method: "GET",
  });

  return handleResponse<BalanceSnapshot>(response);
}
