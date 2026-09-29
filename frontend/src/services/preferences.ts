import { apiRequest } from "./api";
import type { UserPreferences } from "../types/preferences";

export async function getPreferences() {
  return apiRequest("/preferences");
}

export async function updatePreferences(
  preferences: UserPreferences
) {
  return apiRequest("/preferences", {
    method: "PUT",
    body: JSON.stringify(preferences),
  });
}