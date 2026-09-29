export type Language = "EN" | "AM";

export type ExperienceLevel =
  | "ENTRY"
  | "JUNIOR"
  | "MID"
  | "SENIOR"
  | "NOT_SPECIFIED";

export interface UserPreferences {
  language: Language;
  categories: string[];
  locations: string[];
  experienceLevel: ExperienceLevel;
  instantAlerts?: boolean;
  digestAlerts?: boolean;
}