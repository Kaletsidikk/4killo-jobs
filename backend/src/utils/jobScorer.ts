/**
 * Job Matching Algorithm – Comprehensive Intelligent Scorer
 *
 * Computes a relevance score (0–100) for a job against a user's preferences.
 * Handles synonyms, title heuristics, subcategories, location normalization,
 * and experience level matching.
 */

export interface MatchedJob {
  score: number;
  matchReasons: MatchReasons;
}

export interface MatchReasons {
  category: boolean;
  location: boolean;
  experience: boolean;
  fresh: boolean;
}

export interface ScorerPrefs {
  categories: string[];
  locations: string[];
  experienceLevel: string;
}

const FRESHNESS_DAYS = 7;

/**
 * Maps known user selection tags to related tokens/subcategories in the database
 */
const CATEGORY_SYNONYMS: Record<string, string[]> = {
  "software development": [
    "software", "developer", "software engineer", "it & software", "tech & software",
    "web", "frontend", "backend", "fullstack", "programming", "code", "dev"
  ],
  "it & software": [
    "software", "developer", "it", "tech", "web", "computer", "systems"
  ],
  "it & networking": [
    "it", "networking", "network", "system admin", "hardware", "infrastructure", "telecom"
  ],
  "finance & accounting": [
    "finance", "accounting", "accountant", "banking", "audit", "cashier", "bookkeeper", "tax"
  ],
  "banking & finance": [
    "banking", "finance", "bank", "accountant", "credit", "loan", "auditor"
  ],
  "marketing": [
    "marketing", "social media", "outreach", "advert", "digital marketing", "seo", "branding"
  ],
  "sales": [
    "sales", "cashier", "seller", "outreach", "agent", "commercial", "retail", "store"
  ],
  "sales & marketing": [
    "sales", "marketing", "promoter", "cashier", "seller", "advert"
  ],
  "human resources": [
    "human resources", "hr", "talent", "recruiter", "personnel", "administration"
  ],
  "administration": [
    "admin", "administration", "assistant", "secretary", "office", "clerk", "receptionist"
  ],
  "engineering": [
    "engineering", "engineer", "civil", "mechanical", "electrical", "construction", "architect"
  ],
  "healthcare": [
    "health", "nurse", "midwife", "doctor", "medical", "clinic", "pharmacy", "hospital"
  ],
};

export type MatchLabel = 'Top Match' | 'Strong Match' | 'Partial Match' | 'Nearby' | null;

export function getMatchLabel(score: number): MatchLabel {
  if (score >= 80) return 'Top Match';
  if (score >= 50) return 'Strong Match';
  if (score >= 25) return 'Partial Match';
  if (score >= 10) return 'Nearby';
  return null;
}

/**
 * Score a single job against the user's preferences.
 */
export function scoreJob(
  job: {
    title: string;
    category: string;
    location: string;
    experienceLevel: string;
    createdAt: Date;
  },
  prefs: ScorerPrefs,
): MatchedJob {
  const reasons: MatchReasons = {
    category: false,
    location: false,
    experience: false,
    fresh: false,
  };

  const titleLower = (job.title || "").toLowerCase();
  const categoryLower = (job.category || "").toLowerCase();
  const locationLower = (job.location || "").toLowerCase();

  let categoryPoints = 0;

  // ── 1. Category Matching (Max 60 points) ──────────────────────────────────
  if (prefs.categories.length > 0) {
    for (const prefCat of prefs.categories) {
      const prefLower = prefCat.toLowerCase().trim();

      // A. Direct category matches (IT & Software, Tech & Software) get highest priority
      if (
        categoryLower === prefLower ||
        categoryLower === "it & software" ||
        categoryLower === "tech & software"
      ) {
        reasons.category = true;
        categoryPoints = Math.max(categoryPoints, 70);
        break;
      }

      // B. Strong tech title matches (Developer, Programmer, Software Engineer, Web Developer)
      const strongTechKeywords = ["developer", "software", "programmer", "frontend", "backend", "fullstack", "web dev"];
      const hasStrongTech = strongTechKeywords.some(kw => titleLower.includes(kw));
      if (hasStrongTech && prefLower.includes("software")) {
        reasons.category = true;
        categoryPoints = Math.max(categoryPoints, 65);
        break;
      }

      // C. General synonyms, matching whole words only so "dev" does not match "development"
      const synonyms = CATEGORY_SYNONYMS[prefLower] || [];
      const synonymMatch = synonyms.some(syn => {
        const regex = new RegExp(`\\b${syn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        return regex.test(categoryLower) || regex.test(titleLower);
      });

      if (synonymMatch) {
        reasons.category = true;
        categoryPoints = Math.max(categoryPoints, 40);
        break;
      }
    }
  }

  // ── 2. Location Matching (Max 25 points) ──────────────────────────────────
  let locationPoints = 0;
  if (prefs.locations.length > 0) {
    for (const prefLoc of prefs.locations) {
      const locLower = prefLoc.toLowerCase().trim();

      // Exact or substring match (e.g. "Addis Ababa (Kazanchis)" contains "Addis Ababa")
      if (
        locationLower.includes(locLower) ||
        locLower.includes(locationLower) ||
        (locLower === "remote" && (locationLower.includes("remote") || titleLower.includes("remote")))
      ) {
        reasons.location = true;
        locationPoints = 25;
        break;
      }
    }
  }

  // ── 3. Experience Level Matching (Max 10 points) ──────────────────────────
  let experiencePoints = 0;
  if (prefs.experienceLevel && prefs.experienceLevel !== "NOT_SPECIFIED") {
    if (job.experienceLevel === prefs.experienceLevel) {
      reasons.experience = true;
      experiencePoints = 10;
    }
  }

  // ── 4. Freshness (Max 5 points) ──────────────────────────────────────────
  let freshPoints = 0;
  const ageMs = Date.now() - new Date(job.createdAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays <= FRESHNESS_DAYS) {
    reasons.fresh = true;
    freshPoints = 5;
  }

  const hasSpecificPreferences = prefs.categories.length > 0;
  
  // Strictness gate: If user specified categories, but this job didn't match category at all,
  // do NOT let a location match propel an unrelated job into top results.
  let finalScore = categoryPoints + locationPoints + experiencePoints + freshPoints;
  if (hasSpecificPreferences && !reasons.category) {
    // Unrelated job gets clamped to a low score so it never outranks matching jobs
    finalScore = Math.min(finalScore, 5);
  }

  return {
    score: Math.min(100, Math.max(0, finalScore)),
    matchReasons: reasons,
  };
}

/**
 * Sort comparator: highest score first, then newest job first as tiebreaker.
 */
export function compareByScore(
  a: { score: number; createdAt: Date },
  b: { score: number; createdAt: Date },
): number {
  if (b.score !== a.score) return b.score - a.score;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}
