/**
 * Bilingual Amharic ⇄ English Search Lexicon
 *
 * Expands Amharic search terms (both Fidel and Latin) into their English equivalents
 * and vice-versa, so searching for "ሹፌር" immediately finds "Driver" and "Software"
 * finds both "developer" and "software".
 */

export const AMHARIC_ENGLISH_MAP: Record<string, string[]> = {
  // Transport & Drivers
  "ሹፌር": ["driver", "chauffeur", "transport"],
  "አሽከርካሪ": ["driver", "operator"],
  "ሞተረኛ": ["delivery", "rider", "bike", "driver"],
  "መኪና": ["driver", "car", "vehicle"],
  "driver": ["driver", "ሹፌር"],

  // Software & Tech
  "ሶፍትዌር": ["software", "developer", "programmer", "engineer"],
  "ዴቨሎፐር": ["developer", "development", "engineer", "software"],
  "ኮምፒውተር": ["computer", "it", "software", "tech"],
  "ዌብሳይት": ["website", "web", "developer", "frontend"],
  "developer": ["developer", "software", "web"],
  "software": ["software", "developer", "systems", "tech"],

  // Banking & Accounting
  "አካውንታንት": ["accountant", "accounting", "finance", "auditor"],
  "አካውንቲንግ": ["accounting", "accountant", "finance"],
  "ሂሳብ": ["accountant", "accounting", "finance", "audit", "cashier"],
  "ገንዘብ ተቀባይ": ["cashier", "teller", "bank"],
  "ባንክ": ["bank", "banking", "teller", "trainee"],
  "ቴለር": ["teller", "bank", "cashier"],
  "ኦዲተር": ["auditor", "audit", "accounting"],
  "accountant": ["accountant", "accounting", "አካውንታንት", "ሂሳብ"],
  "cashier": ["cashier", "sales", "ገንዘብ ተቀባይ"],

  // Sales & Marketing
  "ሽያጭ": ["sales", "marketing", "seller", "promoter"],
  "ሻጭ": ["sales", "seller", "cashier"],
  "ማርኬቲንግ": ["marketing", "sales", "social media", "outreach"],
  "sales": ["sales", "ሽያጭ", "seller"],
  "marketing": ["marketing", "ማርኬቲንግ", "sales", "social media"],

  // Healthcare
  "ነርስ": ["nurse", "midwife", "nursing", "clinical"],
  "አዋላጅ": ["midwife", "nurse", "fertility"],
  "ህክምና": ["nurse", "health", "clinical", "medical"],
  "ዶክተር": ["doctor", "physician", "medical"],
  "nurse": ["nurse", "midwife", "ነርስ"],
  "midwife": ["midwife", "nurse", "አዋላጅ"],

  // Administrative & Office
  "ረዳት": ["assistant", "admin", "office"],
  "ቢሮ": ["office", "admin", "assistant"],
  "ጸሐፊ": ["secretary", "assistant", "clerk", "admin"],
  "secretary": ["secretary", "assistant", "admin", "ጸሐፊ"],
  "assistant": ["assistant", "office", "admin", "ረዳት"],

  // Hospitality & Food
  "አስተናጋጅ": ["waiter", "waitress", "server", "host"],
  "ምግብ": ["chef", "cook", "kitchen", "food"],
  "ኬክ": ["cake", "sweets", "bakery"],
  "waiter": ["waiter", "waitress", "አስተናጋጅ"],

  // Education
  "አስተማሪ": ["teacher", "tutor", "instructor", "lecturer"],
  "መምህር": ["teacher", "tutor", "instructor"],
  "tutor": ["tutor", "teacher", "አስተማሪ"],
  "teacher": ["teacher", "tutor", "መምህር"],

  // Security & Cleaning
  "ጥበቃ": ["security", "guard", "safety"],
  "ጽዳት": ["cleaner", "janitor", "housekeeping"],
  "security": ["security", "guard", "ጥበቃ"],
};

/**
 * Returns expanded search terms for any input (Amharic or English).
 * For example: "ሹፌር" -> ["ሹፌር", "driver", "chauffeur", "transport"]
 * "software" -> ["software", "developer", "systems", "tech"]
 */
export function expandSearchTerms(query: string): string[] {
  if (!query || !query.trim()) return [];
  const trimmed = query.trim().toLowerCase();
  const set = new Set<string>();
  set.add(query.trim()); // Original query

  // Check direct map
  for (const [key, terms] of Object.entries(AMHARIC_ENGLISH_MAP)) {
    if (trimmed.includes(key.toLowerCase()) || key.toLowerCase().includes(trimmed)) {
      terms.forEach((t) => set.add(t));
    }
  }

  // Token-level check for multi-word phrases
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    for (const [key, terms] of Object.entries(AMHARIC_ENGLISH_MAP)) {
      if (token.includes(key.toLowerCase()) || key.toLowerCase().includes(token)) {
        terms.forEach((t) => set.add(t));
      }
    }
  }

  return Array.from(set);
}
