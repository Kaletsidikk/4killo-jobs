
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

import {
  getPreferences,
  updatePreferences,
} from "../services/preferences";

import type { ExperienceLevel } from "../types/preferences";

const categories = [
  "Software Development",
  "IT & Networking",
  "Finance & Accounting",
  "Marketing",
  "Sales",
  "Human Resources",
  "Engineering",
  "Healthcare",
];

const experienceLevels: {
  value: ExperienceLevel;
  label: string;
  description: string;
}[] = [
  {
    value: "ENTRY",
    label: "Entry Level",
    description: "Little or no professional experience",
  },
  {
    value: "JUNIOR",
    label: "Junior",
    description: "Some professional experience",
  },
  {
    value: "MID",
    label: "Mid Level",
    description: "Several years of experience",
  },
  {
    value: "SENIOR",
    label: "Senior",
    description: "Experienced professional",
  },
  {
    value: "NOT_SPECIFIED",
    label: "Not Specified",
    description: "Show me opportunities at any level",
  },
];

const locations = [
  "Addis Ababa",
  "Dire Dawa",
  "Bahir Dar",
  "Hawassa",
  "Mekelle",
  "Gondar",
  "Adama",
  "Remote",
];

interface EditPreferencesProps {
  onBack: () => void;
}

function EditPreferences({ onBack }: EditPreferencesProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [experienceLevel, setExperienceLevel] =
    useState<ExperienceLevel | null>(null);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

  const [instantAlerts, setInstantAlerts] = useState(true);
  const [digestAlerts, setDigestAlerts] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setLoading(true);
        setError(null);

        const preferences = await getPreferences();

        setSelectedCategories(preferences.categories ?? []);
        setSelectedLocations(preferences.locations ?? []);
        setExperienceLevel(preferences.experienceLevel ?? null);
        setInstantAlerts(preferences.instantAlerts ?? true);
        setDigestAlerts(preferences.digestAlerts ?? true);
      } catch (err) {
        console.error("Failed to load preferences:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load your preferences"
        );
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, []);

  const toggleCategory = (category: string) => {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    );
  };

  const toggleLocation = (location: string) => {
    setSelectedLocations((current) =>
      current.includes(location)
        ? current.filter((item) => item !== location)
        : [...current, location]
    );
  };

  const handleSave = async () => {
    if (
      selectedCategories.length === 0 ||
      !experienceLevel ||
      selectedLocations.length === 0
    ) {
      setError(
        "Please select at least one category, experience level, and location."
      );
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      await updatePreferences({
        categories: selectedCategories,
        locations: selectedLocations,
        experienceLevel,
        instantAlerts,
        digestAlerts,
      });

      setSuccess(true);
    } catch (err) {
      console.error("Failed to update preferences:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to update your preferences"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3 px-5 py-4">
            <button
              type="button"
              onClick={onBack}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100"
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>

            <h1 className="text-lg font-bold">
              Job Preferences
            </h1>
          </div>
        </header>

        <div className="px-5 pt-5">
          <div className="rounded-2xl bg-white p-5 text-sm text-slate-500">
            Loading your preferences...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-28 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3 px-5 py-4">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>

          <div>
            <h1 className="text-lg font-bold">
              Job Preferences
            </h1>

            <p className="text-xs text-slate-500">
              Update the jobs you want to see
            </p>
          </div>
        </div>
      </header>

      <main className="space-y-6 px-5 py-5">
        {/* Categories */}
        <section>
          <h2 className="text-base font-bold">
            Job Categories
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Select one or more categories.
          </p>

          <div className="mt-3 grid grid-cols-2 gap-3">
            {categories.map((category) => {
              const selected = selectedCategories.includes(category);

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className={`rounded-xl border p-3 text-left text-sm font-medium transition ${
                    selected
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white hover:border-blue-400"
                  }`}
                >
                  {selected && "✓ "}
                  {category}
                </button>
              );
            })}
          </div>
        </section>

        {/* Experience */}
        <section>
          <h2 className="text-base font-bold">
            Experience Level
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Select the level that best matches you.
          </p>

          <div className="mt-3 space-y-3">
            {experienceLevels.map((level) => {
              const selected = experienceLevel === level.value;

              return (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setExperienceLevel(level.value)}
                  className={`w-full rounded-xl border bg-white p-4 text-left transition ${
                    selected
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:border-blue-400"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                      {level.label}
                    </span>

                    {selected && (
                      <span className="font-bold text-blue-600">
                        ✓
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-sm text-gray-500">
                    {level.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Locations */}
        <section>
          <h2 className="text-base font-bold">
            Preferred Locations
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Select one or more locations.
          </p>

          <div className="mt-3 grid grid-cols-2 gap-3">
            {locations.map((location) => {
              const selected = selectedLocations.includes(location);

              return (
                <button
                  key={location}
                  type="button"
                  onClick={() => toggleLocation(location)}
                  className={`rounded-xl border p-3 text-left text-sm font-medium transition ${
                    selected
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white hover:border-blue-400"
                  }`}
                >
                  {selected && "✓ "}
                  {location}
                </button>
              );
            })}
          </div>
        </section>

        {/* Notifications */}
        <section>
          <h2 className="text-base font-bold">
            Job Alerts
          </h2>

          <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <label className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
              <div>
                <p className="text-sm font-medium">
                  Instant Alerts
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Get notified about matching jobs immediately.
                </p>
              </div>

              <input
                type="checkbox"
                checked={instantAlerts}
                onChange={(event) =>
                  setInstantAlerts(event.target.checked)
                }
                className="h-5 w-5"
              />
            </label>

            <label className="flex items-center justify-between px-4 py-4">
              <div>
                <p className="text-sm font-medium">
                  Digest Alerts
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Receive a summary of matching jobs.
                </p>
              </div>

              <input
                type="checkbox"
                checked={digestAlerts}
                onChange={(event) =>
                  setDigestAlerts(event.target.checked)
                }
                className="h-5 w-5"
              />
            </label>
          </div>
        </section>

        {error && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
            Preferences updated successfully.
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={
            saving ||
            selectedCategories.length === 0 ||
            !experienceLevel ||
            selectedLocations.length === 0
          }
          className="w-full rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Preferences"}
        </button>
      </main>
    </div>
  );
}

export default EditPreferences;
