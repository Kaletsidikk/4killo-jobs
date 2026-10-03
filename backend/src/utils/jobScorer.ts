/**
 * Job Matching Algorithm –  Scorer
 *
 * Computes a relevance score (0–100) for a single job against a user's
 * saved Preference record.  

 *
 * ─── Score breakdown ─────────────────────────────────────────────────────────
 *  Signal                  Points   Notes
 *  ──────────────────────────────────────────────────────────────────────────
 *  Category match            40     Case-insensitive exact match against any
 *                                   of the user's preferred categories array.
 *  Location match            30     Case-insensitive substring: user pref
 *                                   "Addis" matches "Addis Ababa", etc.
 *  Experience level match    20     Exact enum comparison.
 *  Freshness (≤ 7 days)      10     Job created within the last 7 days.
 *  ──────────────────────────────────────────────────────────────────────────
 *  Maximum possible score   100
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Breakdown string format:  "category,location,experience,fresh"
 * Each segment is the awarded points so callers can surface match reasons.
 */

export interface MatchedJob {
  score:          number;
  matchReasons:   MatchReasons;
}

export interface MatchReasons {
  category:   boolean;   // user pref category matched
  location:   boolean;   // user pref location matched
  experience: boolean;   // experience level matched
  fresh:      boolean;   // posted within last 7 days
}

export interface ScorerPrefs {
  categories:      string[];
  locations:       string[];
  experienceLevel: string;
}

const WEIGHTS = {
  category:   40,
  location:   30,
  experience: 20,
  fresh:      10,
} as const;

const FRESHNESS_DAYS = 7;

/**
 * Maps a 0–100 score to a human-readable match tier label.
 *
 *  90–100 → 'Top Match'
 *  60–89  → 'Strong Match'
 *  30–59  → 'Partial Match'
 *   1–29  → 'Nearby'
 *      0  → null  (no badge shown)
 */
export type MatchLabel = 'Top Match' | 'Strong Match' | 'Partial Match' | 'Nearby' | null;

export function getMatchLabel(score: number): MatchLabel {
  if (score >= 90) return 'Top Match';
  if (score >= 60) return 'Strong Match';
  if (score >= 30) return 'Partial Match';
  if (score >= 1)  return 'Nearby';
  return null;
}

/**
 * Score a single job against the user's preferences.
 *
 * @param job   - Minimal job fields needed for scoring
 * @param prefs - The user's Preference record
 */
export function scoreJob(
  job: {
    category:        string;
    location:        string;
    experienceLevel: string;
    createdAt:       Date;
  },
  prefs: ScorerPrefs,
): MatchedJob {
  const reasons: MatchReasons = {
    category:   false,
    location:   false,
    experience: false,
    fresh:      false,
  };

  // ── Category: any preferred category matches the job's category ────────────
  if (prefs.categories.length > 0) {
    const jobCat = job.category.toLowerCase();
    reasons.category = prefs.categories.some(
      (c) => c.toLowerCase() === jobCat,
    );
  }

  // ── Location: any preferred location is a substring of the job's location ──
  // e.g. pref "Addis" matches job location "Addis Ababa"
  if (prefs.locations.length > 0) {
    const jobLoc = job.location.toLowerCase();
    reasons.location = prefs.locations.some(
      (l) => jobLoc.includes(l.toLowerCase()) || l.toLowerCase().includes(jobLoc),
    );
  }

  // ── Experience level: exact enum match ─────────────────────────────────────
  reasons.experience =
    prefs.experienceLevel !== 'NOT_SPECIFIED' &&
    job.experienceLevel === prefs.experienceLevel;

  // ── Freshness: job created within the last N days ──────────────────────────
  const ageMs   = Date.now() - new Date(job.createdAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  reasons.fresh = ageDays <= FRESHNESS_DAYS;

  // ── Compute total score ────────────────────────────────────────────────────
  const score =
    (reasons.category   ? WEIGHTS.category   : 0) +
    (reasons.location   ? WEIGHTS.location   : 0) +
    (reasons.experience ? WEIGHTS.experience : 0) +
    (reasons.fresh      ? WEIGHTS.fresh      : 0);

  return { score, matchReasons: reasons };
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
