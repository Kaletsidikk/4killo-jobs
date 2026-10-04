/**
 * 4KILLO — Voxide Voice Search & Capability Contract
 * 
 * Single Source of Truth for Voice AI integration across:
 * - Intent normalization & prompt engineering
 * - Backend GET /api/voice/voxide-capability & POST /api/voice/parse-intent
 * - Frontend Mini App VoxideClient registration in Home.tsx
 */

// ─── 1. CANONICAL ENUMS & TYPES ─────────────────────────────────────────────

export const CANONICAL_CATEGORIES = [
  "IT & Software",
  "Banking & Finance",
  "Healthcare",
  "Engineering & Construction",
  "NGO & Humanitarian",
  "Sales & Marketing",
  "Logistics & Transport",
  "Administration & HR",
  "Hospitality & Tourism",
  "Manufacturing & Production",
  "Other"
] as const;

export type JobCategory = typeof CANONICAL_CATEGORIES[number];

export type ExperienceLevel = "ENTRY" | "JUNIOR" | "MID" | "SENIOR" | "NOT_SPECIFIED";

export type EmploymentType = "Full-time" | "Part-time" | "Internship" | "Contract";

export interface SearchJobsParams {
  keyword?: string;
  category?: JobCategory;
  location?: string;
  experienceLevel?: ExperienceLevel;
  employmentType?: EmploymentType;
}

export interface SearchJobsResult {
  status: "success" | "error";
  count: number;
  appliedFilters: SearchJobsParams;
  message?: string;
}

export interface ClearFiltersResult {
  status: "success";
  message: string;
}

// ─── 2. VOXIDE CAPABILITY MANIFEST ──────────────────────────────────────────

export const VOXIDE_SEARCH_CAPABILITY = {
  name: "searchJobs",
  description:
    "Search, filter, and discover job vacancies in Ethiopia. Use whenever the user asks for jobs by role, company, sector, location, or experience level in Amharic, English, or Amglish.",
  params: {
    keyword: {
      type: "string",
      description: "Target job title or role in English or standard Amharic (e.g., 'Accountant', 'Delivery Driver', 'Nurse', 'React Developer')",
    },
    category: {
      type: "string",
      enum: CANONICAL_CATEGORIES as unknown as string[],
      description: "Normalized Ethiopian job category.",
    },
    location: {
      type: "string",
      description: "Target city or region in Ethiopia (e.g., 'Addis Ababa', 'Hawassa', 'Bahir Dar', 'Remote').",
    },
    experienceLevel: {
      type: "string",
      enum: ["ENTRY", "JUNIOR", "MID", "SENIOR", "NOT_SPECIFIED"],
      description: "Seniority tier. Set to 'ENTRY' for fresh graduates, 0 years, 'ያለ ልምድ', or 'ለጀማሪ'.",
    },
    employmentType: {
      type: "string",
      enum: ["Full-time", "Part-time", "Internship", "Contract"],
      description: "Work arrangement type.",
    },
  },
};

export const VOXIDE_CLEAR_CAPABILITY = {
  name: "clearFilters",
  description:
    "Reset all active search filters and return to all latest jobs when user says 'reset', 'clear', or 'ሁሉንም አሳየኝ'.",
  params: {},
};

export const VOXIDE_CAPABILITY_MANIFEST = {
  version: "1.0.0",
  service: "4killo_job_search",
  supportedLanguages: ["am-ET", "en-US", "am-Latn"],
  capabilities: [VOXIDE_SEARCH_CAPABILITY, VOXIDE_CLEAR_CAPABILITY],
};

// ─── 3. BILINGUAL VOXIDE SYSTEM PROMPT ──────────────────────────────────────

export const VOXIDE_SYSTEM_PROMPT = `
You are the Voice AI NLU Engine for 4KILLO, Ethiopia's premier Telegram job aggregation platform.
Your task is to listen to Ethiopian job seekers speaking in Amharic (Fidel), English, or Latin-transliterated Amharic (Amglish), and invoke the 'searchJobs' capability with accurately normalized parameters.

Rules for Intent Extraction:
1. Strip conversational filler:
   - Amharic: "እባክህ ፈልግልኝ", "ስራ ፈልጌ ነበር", "የሚገኝ ከሆነ", "እስኪ እይልኝ", "ስራ አለ"
   - English: "Can you please find me", "I am looking for", "Show me jobs for"
2. Map informal/spoken Ethiopian titles to canonical keywords and categories:
   - "ሞተረኛ" / "የሞተር ሹፌር" -> keyword: "Delivery Rider", category: "Logistics & Transport"
   - "የሂሳብ ሹም" / "አካውንታንት" -> keyword: "Accountant", category: "Banking & Finance"
   - "የሽያጭ ሰራተኛ" / "የሽያጭ ባለሙያ" -> keyword: "Sales Person", category: "Sales & Marketing"
   - "ገንዘብ ተቀባይ" / "ቴለር" -> keyword: "Bank Teller", category: "Banking & Finance"
   - "አስተናጋጅ" / "አስተናጋጅ ሴት" -> keyword: "Waiter / Waitress", category: "Hospitality & Tourism"
   - "የጥበቃ ሰራተኛ" / "ጥበቃ" -> keyword: "Security Guard", category: "Other"
   - "የቢሮ ረዳት" / "ጸሐፊ" -> keyword: "Office Assistant", category: "Administration & HR"
   - "ነርስ" / "አዋላጅ" -> keyword: "Nurse", category: "Healthcare"
3. Detect Fresh Graduate / Entry Level:
   - "ያለ ልምድ", "አዲስ ተመራቂ", "ለጀማሪ", "0 አመት", "fresh graduate", "no experience" -> experienceLevel: "ENTRY"
4. Normalize Addis Ababa Sub-Cities:
   - "ቦሌ", "መገናኛ", "ፒያሳ", "ካዛንቺስ", "ሲኤምሲ", "ገርጂ", "አያት", "ሳሪስ", "ለቡ" -> location: "Addis Ababa"
5. Remote work detection:
   - "ከቤት ሆኖ", "በኦንላይን", "work from home", "remote" -> location: "Remote"
`.trim();

// ─── 4. ETHIOPIAN SPEECH INTENT NORMALIZATION LEXICON ───────────────────────

interface TitleMapping {
  patterns: RegExp;
  keyword: string;
  category: JobCategory;
}

const TITLE_MAPPINGS: TitleMapping[] = [
  // Commercial & Logistics
  { patterns: /(?:(?:የ|ለ|በ|ከ)?(?:ሞተረኛ|ሞተር)|\b(?:delivery rider|delivery driver|bike delivery)\b)/i, keyword: "Delivery Rider", category: "Logistics & Transport" },
  { patterns: /(?:(?:የ|ለ|በ|ከ)?(?:ሹፌር|መኪና አሽከርካሪ|ደረቅ 1|ህዝብ 1)|\b(?:driver)\b)/i, keyword: "Driver", category: "Logistics & Transport" },
  { patterns: /(?:(?:የ|ለ|በ|ከ)?(?:ሽያጭ)|\b(?:sales person|sales representative|sales rep|marketing officer)\b)/i, keyword: "Sales Person", category: "Sales & Marketing" },
  { patterns: /(?:(?:የ|ለ|በ|ከ)?(?:አስተናጋጅ)|\b(?:waiter|waitress|cashier restaurant)\b)/i, keyword: "Waiter / Waitress", category: "Hospitality & Tourism" },
  { patterns: /(?:(?:የ|ለ|በ|ከ)?(?:ጥበቃ)|\b(?:security guard|security officer)\b)/i, keyword: "Security Guard", category: "Other" },
  { patterns: /(?:(?:የ|ለ|በ|ከ)?(?:ጽዳት)|\b(?:cleaner|janitor)\b)/i, keyword: "Cleaner", category: "Administration & HR" },
  { patterns: /(?:(?:የ|ለ|በ|ከ)?(?:መጋዘን|ስቶር|ዕቃ ግምጃ)|\b(?:store keeper|warehouse assistant)\b)/i, keyword: "Store Keeper", category: "Logistics & Transport" },

  // Banking & Professional
  { patterns: /(?:(?:የ|ለ|በ|ከ)?(?:ሂሳብ ሹም|አካውንታንት|አካውንቲንግ|ሂሳብ)|\b(?:accountant|accounting)\b)/i, keyword: "Accountant", category: "Banking & Finance" },
  { patterns: /(?:(?:የ|ለ|በ|ከ)?(?:ባንክ|ቴለር|ገንዘብ ተቀባይ)|\b(?:bank teller|bank trainee|bank)\b)/i, keyword: "Bank Trainee", category: "Banking & Finance" },
  { patterns: /(?:(?:የ|ለ|በ|ከ)?(?:ኦዲተር|ኦዲት)|\b(?:auditor|internal audit)\b)/i, keyword: "Auditor", category: "Banking & Finance" },

  // Tech & IT
  { patterns: /(?:(?:የ|ለ|በ|ከ)?(?:ሶፍትዌር|ዴቨሎፐር|ፕሮግራመር)|\b(?:software developer|software engineer|frontend|backend|react|flutter|fullstack)\b)/i, keyword: "Software Developer", category: "IT & Software" },
  { patterns: /(?:(?:የ|ለ|በ|ከ)?(?:ግራፊክስ|ዲዛይን)|\b(?:graphic design|graphics designer|ui ux)\b)/i, keyword: "Graphic Designer", category: "IT & Software" },

  // Healthcare
  { patterns: /(?:(?:የ|ለ|በ|ከ)?(?:ነርስ|ህክምና)|\b(?:nurse|midwife|clinical nurse)\b)/i, keyword: "Nurse", category: "Healthcare" },
  { patterns: /(?:(?:የ|ለ|በ|ከ)?(?:ላብራቶሪ|ላቦራቶሪ)|\b(?:lab technician|laboratory)\b)/i, keyword: "Laboratory Technician", category: "Healthcare" },
  { patterns: /(?:(?:የ|ለ|በ|ከ)?(?:ፋርማሲስት|መድሃኒት)|\b(?:pharmacist|druggist)\b)/i, keyword: "Pharmacist", category: "Healthcare" },

  // Engineering & Construction
  { patterns: /(?:(?:የ|ለ|በ|ከ)?(?:መሃንዲስ|ሳይት ኢንጅነር|ሲቪል መሃንዲስ)|\b(?:civil engineer|site engineer|structural engineer)\b)/i, keyword: "Site Engineer", category: "Engineering & Construction" },
  { patterns: /(?:(?:የ|ለ|በ|ከ)?(?:ፎርማን)|\b(?:foreman|construction foreman)\b)/i, keyword: "Foreman", category: "Engineering & Construction" },

  // Administration & NGO
  { patterns: /(?:(?:የ|ለ|በ|ከ)?(?:ጸሐፊ|ቢሮ ረዳት|ሴክሬታሪ)|\b(?:office assistant|secretary|admin assistant)\b)/i, keyword: "Office Assistant", category: "Administration & HR" },
  { patterns: /(?:(?:የ|ለ|በ|ከ)?(?:ሰብአዊ|ኤን ጂ ኦ|ፕሮጀክት አስተባባሪ)|\b(?:ngo|project coordinator|wash coordinator)\b)/i, keyword: "Project Coordinator", category: "NGO & Humanitarian" },
];

// ─── 5. DETERMINISTIC INTENT PARSER ENGINE ──────────────────────────────────

/**
 * Normalizes raw spoken transcript into exact SearchJobsParams matching DB schema.
 * Used by Eden's backend (/api/voice/parse-intent) and Kaletsidik's test suite.
 */
export function parseEthiopianVoiceIntent(rawTranscript: string): SearchJobsParams {
  if (!rawTranscript || !rawTranscript.trim()) {
    return {};
  }

  const query: SearchJobsParams = {};
  const cleaned = rawTranscript.trim();

  // 1. Detect Experience Level
  if (
    /(አዲስ ተመራቂ|ለአዲስ ተመራቂ|ያለ ልምድ|ለጀማሪ|ጀማሪ|0 አመት|0 ዓመት|fresh graduate|entry level|no experience|junior)/i.test(cleaned)
  ) {
    query.experienceLevel = "ENTRY";
  } else if (/(ከፍተኛ|የበላይ|ዋና ባለሙያ|senior|lead|head|director)/i.test(cleaned)) {
    query.experienceLevel = "SENIOR";
  } else if (/(መካከለኛ|mid level|mid)/i.test(cleaned)) {
    query.experienceLevel = "MID";
  }

  // 2. Detect Employment Type
  if (/(የትርፍ ሰዓት|የትርፍ ጊዜ|part[- ]time)/i.test(cleaned)) {
    query.employmentType = "Part-time";
  } else if (/(የሙሉ ጊዜ|ቋሚ|full[- ]time)/i.test(cleaned)) {
    query.employmentType = "Full-time";
  } else if (/(ልምምድ|ኢንተርን|internship|intern)/i.test(cleaned)) {
    query.employmentType = "Internship";
  }

  // 3. Detect Location
  if (/(ቦሌ|መገናኛ|ፒያሳ|ካዛንቺስ|ሲኤምሲ|ገርጂ|አያት|ሳሪስ|ለቡ|አዲስ አበባ|addis ababa|addis)/i.test(cleaned)) {
    query.location = "Addis Ababa";
  } else if (/(ሀዋሳ|hawassa|hawasa)/i.test(cleaned)) {
    query.location = "Hawassa";
  } else if (/(ባህር ዳር|bahir dar|bahirdar)/i.test(cleaned)) {
    query.location = "Bahir Dar";
  } else if (/(አዳማ|adama|nazret)/i.test(cleaned)) {
    query.location = "Adama";
  } else if (/(ድሬዳዋ|dire dawa|diredawa)/i.test(cleaned)) {
    query.location = "Dire Dawa";
  } else if (/(ከቤት ሆኖ|ከቤት|ኦንላይን|በኦንላይን|remote|online|work from home)/i.test(cleaned)) {
    query.location = "Remote";
  }

  // 4. Detect Role & Sector from Lexicon
  for (const mapping of TITLE_MAPPINGS) {
    if (mapping.patterns.test(cleaned)) {
      query.keyword = mapping.keyword;
      query.category = mapping.category;
      break;
    }
  }

  // Fallback: If no specific title matched, test generic sector keywords
  if (!query.category) {
    if (/(ባንክ|ፋይናንስ|ሂሳብ|bank|finance|accounting)/i.test(cleaned)) {
      query.category = "Banking & Finance";
    } else if (/(ኮምፒውተር|ቴክኖሎጂ|ሶፍትዌር|tech|software|it)/i.test(cleaned)) {
      query.category = "IT & Software";
    } else if (/(ጤና|ህክምና|health|hospital|medical)/i.test(cleaned)) {
      query.category = "Healthcare";
    } else if (/(ኮንስትራክሽን|ግንባታ|ኢንጅነሪንግ|construction|engineering)/i.test(cleaned)) {
      query.category = "Engineering & Construction";
    } else if (/(ኤንጂኦ|ግብረ ሰናይ|ngo|humanitarian)/i.test(cleaned)) {
      query.category = "NGO & Humanitarian";
    }
  }

  return query;
}
