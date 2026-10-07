import { apiRequest } from "./api";
import { getToken } from "./authStorage";
import type { UserPreferences } from "../types/preferences";

const PREFS_KEY = "4killo_user_preferences";

export async function getPreferences(): Promise<UserPreferences | null> {
  const token = getToken();
  if (token) {
    try {
      const data = await apiRequest("/preferences");
      if (data) {
        localStorage.setItem(PREFS_KEY, JSON.stringify(data));
        return data;
      }
    } catch (err) {
      console.warn("Backend getPreferences failed, falling back to local storage:", err);
    }
  }

  const cached = localStorage.getItem(PREFS_KEY);
  return cached ? JSON.parse(cached) : null;
}

export async function updatePreferences(
  preferences: UserPreferences
): Promise<any> {
  // Always cache locally so guest and browser sessions retain choices
  localStorage.setItem(PREFS_KEY, JSON.stringify(preferences));

  const token = getToken();
  if (token) {
    try {
      return await apiRequest("/preferences", {
        method: "PUT",
        body: JSON.stringify(preferences),
      });
    } catch (err) {
      console.warn("Backend updatePreferences sync failed:", err);
    }
  }

  return preferences;
}