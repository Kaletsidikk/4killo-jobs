import { apiRequest } from "./api";
import { saveToken } from "./authStorage";

interface AuthResponse {
  token: string;
  user: {
    id: string;
    telegramId: string;
    username?: string;
    firstName?: string;
    language: "EN" | "AM";
  };
}

export async function authenticateTelegram(
  initData: string
): Promise<AuthResponse> {
  const response = await apiRequest("/auth/telegram", {
    method: "POST",
    body: JSON.stringify({
      initData,
    }),
  });

  const data = response as AuthResponse;

  saveToken(data.token);

  return data;
}