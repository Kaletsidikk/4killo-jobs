import { getToken } from "./authStorage";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
) {
  const token = getToken();

  const headers = new Headers(options.headers);

  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.error || `API request failed: ${response.status}`
    );
  }

  return response.json();
}