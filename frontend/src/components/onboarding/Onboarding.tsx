import { useState } from "react";
import type { Language,  ExperienceLevel, } from "../../types/preferences";
import { updatePreferences } from "../../services/preferences";

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

function Onboarding() {
  const [step, setStep] = useState(1);

  const [language, setLanguage] = useState<Language | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [experienceLevel, setExperienceLevel] =
  useState<ExperienceLevel | null>(null);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleContinue = () => {
    if (step === 1 && language) {
      setStep(2);
    } else if (step === 2 && selectedCategories.length > 0) {
    setStep(3);
  } else if (step === 3 && experienceLevel) {
    setStep(4);
  }
  };

  const handleSubmit = async () => {
  if (
    !language ||
    selectedCategories.length === 0 ||
    !experienceLevel ||
    selectedLocations.length === 0
  ) {
    return;
  }

  try {
    setSubmitting(true);
    setError(null);

    await updatePreferences({
      language,
      categories: selectedCategories,
      locations: selectedLocations,
      experienceLevel,
      instantAlerts: true,
      digestAlerts: true,
    });

    console.log("Preferences saved successfully");

    // For now, we'll just show a success message.
    // Later this will navigate to the Home screen.
    alert("Preferences saved successfully!");
  } catch (err) {
    console.error("Failed to save preferences:", err);

    setError(
      err instanceof Error
        ? err.message
        : "Failed to save preferences"
    );
  } finally {
    setSubmitting(false);
  }
};

  return (
    <div className="min-h-screen bg-blue-50 px-6 py-8 flex items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-6">

        {/* Progress */}
        <p className="text-sm text-gray-500 mb-2">
          Step {step} of 4
        </p>

        {step === 1 && (
          <>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome to 4kilo
            </h1>

            <p className="text-gray-600 mt-2 mb-6">
              Let's personalize your job recommendations.
            </p>

            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Choose your language
            </h2>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setLanguage("EN")}
                className={`w-full p-4 rounded-xl border text-left transition ${
                  language === "EN"
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 hover:border-blue-400"
                }`}
              >
                English
              </button>

              <button
                type="button"
                onClick={() => setLanguage("AM")}
                className={`w-full p-4 rounded-xl border text-left transition ${
                  language === "AM"
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 hover:border-blue-400"
                }`}
              >
                አማርኛ
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-2xl font-bold text-gray-900">
              What type of jobs are you interested in?
            </h1>

            <p className="text-gray-600 mt-2 mb-6">
              Select one or more categories.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {categories.map((category) => {
                const selected = selectedCategories.includes(category);

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className={`p-3 rounded-xl border text-sm font-medium text-left transition ${
                      selected
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-200 hover:border-blue-400"
                    }`}
                  >
                    {selected && "✓ "}
                    {category}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 3 && (
  <>
    <h1 className="text-2xl font-bold text-gray-900">
      What is your experience level?
    </h1>

    <p className="text-gray-600 mt-2 mb-6">
      This helps us find jobs that match your experience.
    </p>

    <div className="space-y-3">
      {experienceLevels.map((level) => {
        const selected = experienceLevel === level.value;

        return (
          <button
            key={level.value}
            type="button"
            onClick={() => setExperienceLevel(level.value)}
            className={`w-full p-4 rounded-xl border text-left transition ${
              selected
                ? "border-blue-600 bg-blue-50"
                : "border-gray-200 hover:border-blue-400"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-900">
                {level.label}
              </span>

              {selected && (
                <span className="text-blue-600 font-bold">
                  ✓
                </span>
              )}
            </div>

            <p className="text-sm text-gray-500 mt-1">
              {level.description}
            </p>
          </button>
        );
      })}
    </div>
  </>
)}

{step === 4 && (
  <>
    <h1 className="text-2xl font-bold text-gray-900">
      Where would you like to work?
    </h1>

    <p className="text-gray-600 mt-2 mb-6">
      Select one or more preferred locations.
    </p>

    <div className="grid grid-cols-2 gap-3">
      {locations.map((location) => {
        const selected = selectedLocations.includes(location);

        return (
          <button
            key={location}
            type="button"
            onClick={() => toggleLocation(location)}
            className={`p-3 rounded-xl border text-sm font-medium text-left transition ${
              selected
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-gray-200 hover:border-blue-400"
            }`}
          >
            {selected && "✓ "}
            {location}
          </button>
        );
      })}
    </div>
  </>
)}

        {/* Continue */}
        {error && (
  <p className="mt-4 text-sm text-red-600">
    {error}
  </p>
)}
        <button
          type="button"
          onClick={step === 4 ? handleSubmit : handleContinue}
          disabled={
            submitting ||
            (step === 1 && !language) ||
            (step === 2 && selectedCategories.length === 0) ||
            (step === 3 && !experienceLevel) ||
            (step === 4 && selectedLocations.length === 0)
          }
         className="w-full mt-8 bg-blue-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {step === 4 ? "Get Started" : "Continue"}
        </button>

      </div>
    </div>
  );
}

export default Onboarding;