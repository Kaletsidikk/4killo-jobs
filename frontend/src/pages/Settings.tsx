import { useEffect, useState } from "react";
import { Settings as SettingsIcon, Globe, MapPin, Briefcase, Bell, Check, RotateCcw } from "lucide-react";
import { getPreferences, updatePreferences } from "../services/preferences";
import type { Language, ExperienceLevel, UserPreferences } from "../types/preferences";

const ALL_CATEGORIES = [
  "Software Development",
  "IT & Networking",
  "Finance & Accounting",
  "Marketing",
  "Sales",
  "Human Resources",
  "Engineering",
  "Healthcare",
];

const ALL_LOCATIONS = [
  "Addis Ababa",
  "Dire Dawa",
  "Bahir Dar",
  "Hawassa",
  "Mekelle",
  "Gondar",
  "Adama",
  "Remote",
];

const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: "ENTRY", label: "Entry Level" },
  { value: "JUNIOR", label: "Junior" },
  { value: "MID", label: "Mid Level" },
  { value: "SENIOR", label: "Senior" },
  { value: "NOT_SPECIFIED", label: "Any Level" },
];

function Settings() {
  const [language, setLanguage] = useState<Language>("EN");
  const [categories, setCategories] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("ENTRY");
  const [instantAlerts, setInstantAlerts] = useState(true);
  const [digestAlerts, setDigestAlerts] = useState(true);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const prefs = await getPreferences();
    if (prefs) {
      if (prefs.language) setLanguage(prefs.language);
      if (prefs.categories) setCategories(prefs.categories);
      if (prefs.locations) setLocations(prefs.locations);
      if (prefs.experienceLevel) setExperienceLevel(prefs.experienceLevel);
      if (prefs.instantAlerts !== undefined) setInstantAlerts(prefs.instantAlerts);
      if (prefs.digestAlerts !== undefined) setDigestAlerts(prefs.digestAlerts);
    }
  };

  const toggleCategory = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const toggleLocation = (loc: string) => {
    setLocations((prev) =>
      prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc]
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updated: UserPreferences = {
        language,
        categories,
        locations,
        experienceLevel,
        instantAlerts,
        digestAlerts,
      };
      await updatePreferences(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleResetOnboarding = () => {
    localStorage.removeItem("4killo_onboarding_done");
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-28 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <SettingsIcon size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Preferences & Settings</h1>
              <p className="text-xs text-slate-500">Customize your personalized recommendations</p>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
          >
            {savedSuccess ? (
              <>
                <Check size={14} /> Saved
              </>
            ) : saving ? (
              "Saving…"
            ) : (
              "Save"
            )}
          </button>
        </div>
      </header>

      <main className="space-y-5 px-5 pt-4">
        {/* Language Selection */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Globe size={16} className="text-blue-600" />
            <span>App Language</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setLanguage("EN")}
              className={`rounded-xl border p-3 text-left text-xs font-semibold transition ${
                language === "EN"
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-slate-200 text-slate-700 hover:border-slate-300"
              }`}
            >
              English {language === "EN" && "✓"}
            </button>
            <button
              type="button"
              onClick={() => setLanguage("AM")}
              className={`rounded-xl border p-3 text-left text-xs font-semibold transition ${
                language === "AM"
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-slate-200 text-slate-700 hover:border-slate-300"
              }`}
            >
              አማርኛ {language === "AM" && "✓"}
            </button>
          </div>
        </section>

        {/* Experience Level */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Briefcase size={16} className="text-blue-600" />
            <span>Target Experience Tier</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {EXPERIENCE_LEVELS.map((lvl) => {
              const active = experienceLevel === lvl.value;
              return (
                <button
                  key={lvl.value}
                  type="button"
                  onClick={() => setExperienceLevel(lvl.value)}
                  className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                    active
                      ? "border-blue-600 bg-blue-50 text-blue-700 font-semibold"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {lvl.label} {active && "✓"}
                </button>
              );
            })}
          </div>
        </section>

        {/* Preferred Categories */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Briefcase size={16} className="text-blue-600" />
              <span>Job Categories</span>
            </div>
            <span className="text-[11px] text-slate-400">
              {categories.length} selected
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {ALL_CATEGORIES.map((cat) => {
              const selected = categories.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`rounded-xl border p-2.5 text-left text-xs transition ${
                    selected
                      ? "border-blue-600 bg-blue-50 font-semibold text-blue-700"
                      : "border-slate-200 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {selected && "✓ "}
                  {cat}
                </button>
              );
            })}
          </div>
        </section>

        {/* Locations */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <MapPin size={16} className="text-blue-600" />
              <span>Preferred Locations</span>
            </div>
            <span className="text-[11px] text-slate-400">
              {locations.length} selected
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {ALL_LOCATIONS.map((loc) => {
              const selected = locations.includes(loc);
              return (
                <button
                  key={loc}
                  type="button"
                  onClick={() => toggleLocation(loc)}
                  className={`rounded-xl border p-2.5 text-left text-xs transition ${
                    selected
                      ? "border-blue-600 bg-blue-50 font-semibold text-blue-700"
                      : "border-slate-200 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {selected && "✓ "}
                  {loc}
                </button>
              );
            })}
          </div>
        </section>

        {/* Notification Toggles */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Bell size={16} className="text-blue-600" />
            <span>Telegram Notifications</span>
          </div>
          <div className="mt-3 space-y-3">
            <label className="flex items-center justify-between text-xs font-medium text-slate-700">
              <span>Instant Job Match Alerts</span>
              <input
                type="checkbox"
                checked={instantAlerts}
                onChange={(e) => setInstantAlerts(e.target.checked)}
                className="h-4 w-4 rounded text-blue-600"
              />
            </label>
            <label className="flex items-center justify-between text-xs font-medium text-slate-700">
              <span>Daily Digest Summary</span>
              <input
                type="checkbox"
                checked={digestAlerts}
                onChange={(e) => setDigestAlerts(e.target.checked)}
                className="h-4 w-4 rounded text-blue-600"
              />
            </label>
          </div>
        </section>

        {/* Reset / Redo Onboarding */}
        <section className="pt-2 text-center">
          <button
            type="button"
            onClick={handleResetOnboarding}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-600"
          >
            <RotateCcw size={13} />
            <span>Re-run Welcome Setup Wizard</span>
          </button>
        </section>
      </main>
    </div>
  );
}

export default Settings;