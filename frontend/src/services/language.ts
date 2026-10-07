import { useState, useEffect } from "react";
import type { Language } from "../types/preferences";

const LANG_KEY = "4killo_app_language";

export const translations = {
  EN: {
    langLabel: "EN",
    greeting: "Welcome to 4KILLO!",
    subgreeting: "Find and apply for verified Ethiopian job vacancies.",
    newJobs: "Live jobs",
    searchPlaceholder: "Search title, company, or skills...",
    forYouTitle: "For You",
    forYouSub: "Curated to your preferences",
    savedTitle: "Saved Jobs",
    settingsTitle: "Preferences & Settings",
    homeTab: "Home",
    forYouTab: "For You",
    savedTab: "Saved",
    settingsTab: "Settings",
    shareSuccess: "Job link copied to clipboard!",
    savedSuccess: "Job saved to your bookmarks!",
    unsavedSuccess: "Job removed from bookmarks.",
    viewDetails: "View Details",
    applyNow: "Apply Now",
    openOriginal: "View Original Post",
    allJobs: "All Jobs",
    verifiedListing: "Verified Listing",
    roleSummary: "About the Role",
    candidateRequirements: "Candidate Requirements",
    educationTitle: "Education & Degree",
    offeredSalary: "Offered Compensation",
    negotiable: "Negotiable",
    deadline: "Deadline",
    employmentType: "Employment Type",
    experienceTier: "Experience Tier",
  },
  AM: {
    langLabel: "አማ",
    greeting: "እንኳን ደህና መጡ!",
    subgreeting: "የሚፈልጉትን ስራ ይፈልጉ እና ያመልክቱ።",
    newJobs: "አዲስ ስራዎች",
    searchPlaceholder: "የስራ መደብ፣ ድርጅት ወይም ሙያ ይፈልጉ...",
    forYouTitle: "ለእርስዎ የተመረጡ",
    forYouSub: "በፍላጎትዎ መሰረት የተመረጡ የስራ ማስታወቂያዎች",
    savedTitle: "የተቀመጡ ስራዎች",
    settingsTitle: "ምርጫዎች እና ማስተካከያ",
    homeTab: "ዋና ገጽ",
    forYouTab: "ለእርስዎ",
    savedTab: "የተቀመጡ",
    settingsTab: "ማስተካከያ",
    shareSuccess: "የስራው ሊንክ ተገልብጧል!",
    savedSuccess: "ስራው ወደ ተቀመጡት ገብቷል!",
    unsavedSuccess: "ስራው ከተቀመጡት ተሰርዟል።",
    viewDetails: "ዝርዝር ይመልከቱ",
    applyNow: "አመልክት",
    openOriginal: "ዋናውን ማስታወቂያ ይመልከቱ",
    allJobs: "ሁሉም ስራዎች",
    verifiedListing: "የተረጋገጠ ማስታወቂያ",
    roleSummary: "ስለ ስራው ዝርዝር",
    candidateRequirements: "የስራው መስፈርቶች",
    educationTitle: "የትምህርት ደረጃ",
    offeredSalary: "ደመወዝ",
    negotiable: "በስምምነት",
    deadline: "የማመልከቻ ማብቂያ",
    employmentType: "የስራው አይነት",
    experienceTier: "የስራ ልምድ ደረጃ",
  },
};

export function getAppLanguage(): Language {
  const stored = localStorage.getItem(LANG_KEY);
  return (stored === "AM" || stored === "EN") ? stored : "EN";
}

export function setAppLanguage(lang: Language) {
  localStorage.setItem(LANG_KEY, lang);
  window.dispatchEvent(new CustomEvent("4killo_language_change", { detail: lang }));
}

export function useAppLanguage() {
  const [lang, setLang] = useState<Language>(getAppLanguage());

  useEffect(() => {
    const handleLangChange = (e: any) => {
      setLang(e.detail);
    };
    window.addEventListener("4killo_language_change", handleLangChange);
    return () => window.removeEventListener("4killo_language_change", handleLangChange);
  }, []);

  const toggleLanguage = () => {
    const nextLang: Language = lang === "EN" ? "AM" : "EN";
    setAppLanguage(nextLang);
  };

  return {
    lang,
    setLanguage: setAppLanguage,
    toggleLanguage,
    t: translations[lang],
  };
}
