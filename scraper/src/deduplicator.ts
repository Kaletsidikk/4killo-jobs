import * as crypto from 'crypto';
import { StructuredJob } from './geminiParser';

export interface SourceProvenance {
  sourceChannel: string;
  sourceMessageId: number;
  postUrl: string;
  scrapedAt: string;
}

export interface CanonicalJob {
  id: string; // Deterministic or UUID
  title: string;
  company: string;
  location: string;
  category: string;
  employmentType: string;
  experienceLevel: 'ENTRY' | 'JUNIOR' | 'MID' | 'SENIOR' | 'NOT_SPECIFIED';
  education: string;
  salary: string;
  deadline: string | null;
  description: string;
  requirements: string;
  applyUrl?: string;
  applyEmail?: string;
  applyPhone?: string;
  isDirectContact: boolean;
  
  // Provenance & Deduplication Metadata
  sourceCount: number;
  verificationStatus: 'SINGLE_SOURCE' | 'MULTI_SOURCE';
  sources: SourceProvenance[];
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface IngestedInput {
  sourceChannel: string;
  sourceMessageId: number;
  postUrl: string;
  scrapedAt: string;
  job: StructuredJob;
}

export interface SimilaritySignals {
  exactUrlMatch: boolean;
  exactContactMatch: boolean;
  titleScore: number;
  companyScore: number;
  locationScore: number;
  descriptionScore: number;
  deadlineMatches: boolean;
  overallScore: number;
}

export interface DeduplicationConfig {
  /**
   * Minimum overall similarity score to merge without deterministic contact proof.
   * Conservative starting baseline to minimize false merges.
   */
  highConfidenceThreshold: number; // e.g. 0.88

  /**
   * Minimum company and title scores required to qualify for fuzzy merge.
   * If either is below this, fuzzy merge is rejected regardless of overall score.
   */
  minCompanyScore: number; // e.g. 0.75
  minTitleScore: number;   // e.g. 0.75

  /**
   * Gray zone lower bound. Scores between borderlineThreshold and highConfidenceThreshold
   * trigger AMBIGUOUS_BORDERLINE (candidate for constrained AI or manual review).
   */
  borderlineThreshold: number; // e.g. 0.65
}

export const DEFAULT_DEDUP_CONFIG: DeduplicationConfig = {
  highConfidenceThreshold: 0.88,
  minCompanyScore: 0.75,
  minTitleScore: 0.75,
  borderlineThreshold: 0.65,
};

export class SmartDeduplicator {
  private canonicalJobs: CanonicalJob[] = [];
  private config: DeduplicationConfig;

  constructor(initialJobs: CanonicalJob[] = [], config: DeduplicationConfig = DEFAULT_DEDUP_CONFIG) {
    this.canonicalJobs = [...initialJobs];
    this.config = { ...config };
  }

  public getCanonicalJobs(): CanonicalJob[] {
    return this.canonicalJobs;
  }

  /**
   * Field Normalization: cleans Unicode, punctuation, spacing, URLs, phone numbers
   */
  public normalizeText(text: string | null | undefined): string {
    if (!text) return '';
    return text
      .normalize('NFKD')
      .toLowerCase()
      .replace(/[^\w\s\u1200-\u137F]/g, ' ') // Preserves alphanumeric + Ge'ez/Amharic Unicode range
      .replace(/\s+/g, ' ')
      .trim();
  }

  public normalizeUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    try {
      const parsed = new URL(url.trim());
      // Strip tracking & referral query params (utm_*, ref, start, etc.)
      const cleanParams = new URLSearchParams();
      for (const [key, val] of parsed.searchParams.entries()) {
        if (!key.toLowerCase().startsWith('utm_') && !['ref', 'ref_id', 'affiliate'].includes(key.toLowerCase())) {
          cleanParams.set(key, val);
        }
      }
      parsed.search = cleanParams.toString();
      let clean = parsed.toString().toLowerCase();
      // Remove trailing slash
      if (clean.endsWith('/')) clean = clean.slice(0, -1);
      return clean;
    } catch {
      return url.trim().toLowerCase().replace(/\/+$/, '');
    }
  }

  public normalizePhone(phone: string | null | undefined): string | null {
    if (!phone) return null;
    // Standardize Ethiopian phone numbers: +251 9... -> 09...
    let clean = phone.replace(/[^\d+]/g, '');
    if (clean.startsWith('+251')) clean = '0' + clean.slice(4);
    if (clean.startsWith('251')) clean = '0' + clean.slice(3);
    return clean;
  }

  public normalizeEmail(email: string | null | undefined): string | null {
    if (!email) return null;
    return email.trim().toLowerCase();
  }

  /**
   * Bigram Dice-Sørensen similarity algorithm (O(N) character n-gram comparison).
   * Industry standard for string similarity without heavy external binary dependencies.
   */
  public calculateStringSimilarity(str1: string, str2: string): number {
    const s1 = this.normalizeText(str1);
    const s2 = this.normalizeText(str2);

    if (s1 === s2) return 1.0;
    if (s1.length < 2 || s2.length < 2) return 0.0;

    const getBigrams = (str: string) => {
      const bigrams = new Map<string, number>();
      for (let i = 0; i < str.length - 1; i++) {
        const bigram = str.substring(i, i + 2);
        bigrams.set(bigram, (bigrams.get(bigram) || 0) + 1);
      }
      return bigrams;
    };

    const b1 = getBigrams(s1);
    const b2 = getBigrams(s2);

    let intersection = 0;
    for (const [bigram, count] of b1.entries()) {
      if (b2.has(bigram)) {
        intersection += Math.min(count, b2.get(bigram)!);
      }
    }

    const totalBigrams = (s1.length - 1) + (s2.length - 1);
    return (2.0 * intersection) / totalBigrams;
  }

  /**
   * Evaluates multiple similarity signals between a candidate job and an existing canonical job.
   */
  public evaluateSimilarity(incoming: IngestedInput, existing: CanonicalJob): SimilaritySignals {
    const inc = incoming.job;

    // 1. Direct deterministic signals (Application channels)
    const incUrl = this.normalizeUrl(inc.applyUrl);
    const existUrl = this.normalizeUrl(existing.applyUrl);
    const exactUrlMatch = Boolean(incUrl && existUrl && incUrl === existUrl);

    const incEmail = this.normalizeEmail(inc.applyEmail);
    const existEmail = this.normalizeEmail(existing.applyEmail);
    const exactEmailMatch = Boolean(incEmail && existEmail && incEmail === existEmail);

    const incPhone = this.normalizePhone(inc.applyPhone);
    const existPhone = this.normalizePhone(existing.applyPhone);
    const exactPhoneMatch = Boolean(incPhone && existPhone && incPhone === existPhone);

    const exactContactMatch = exactEmailMatch || exactPhoneMatch;

    // 2. Textual similarity signals
    const titleScore = this.calculateStringSimilarity(inc.title, existing.title);
    const companyScore = this.calculateStringSimilarity(inc.company, existing.company);
    const locationScore = this.calculateStringSimilarity(inc.location, existing.location);
    const descriptionScore = this.calculateStringSimilarity(inc.description, existing.description);

    // 3. Deadline signal
    const deadlineMatches = Boolean(
      inc.deadline && existing.deadline && inc.deadline.trim() === existing.deadline.trim()
    );

    // Weighted similarity calculation:
    // Company (0.35) + Title (0.35) + Description (0.20) + Location (0.10)
    let overallScore = (companyScore * 0.35) + (titleScore * 0.35) + (descriptionScore * 0.20) + (locationScore * 0.10);

    // Bonus for matching deadline
    if (deadlineMatches) {
      overallScore = Math.min(1.0, overallScore + 0.05);
    }

    return {
      exactUrlMatch,
      exactContactMatch,
      titleScore,
      companyScore,
      locationScore,
      descriptionScore,
      deadlineMatches,
      overallScore,
    };
  }

  /**
   * Deterministic & Multi-Signal Decision Matrix:
   * Returns:
   *  'DUPLICATE_CONFIRMED'  (High confidence with proof)
   *  'DISTINCT_JOB'         (Clear rejection or conflicting attributes)
   *  'AMBIGUOUS_BORDERLINE' (Requires constrained AI judgment)
   */
  public classifyMatch(
    signals: SimilaritySignals,
    candidateJob?: StructuredJob,
    existingJob?: CanonicalJob
  ): 'DUPLICATE_CONFIRMED' | 'DISTINCT_JOB' | 'AMBIGUOUS_BORDERLINE' {
    // HARD GUARDRAIL 1: Explicit seniority level conflict (e.g. ENTRY vs SENIOR)
    if (candidateJob && existingJob) {
      const exp1 = candidateJob.experienceLevel;
      const exp2 = existingJob.experienceLevel;
      if (
        (exp1 === 'ENTRY' && (exp2 === 'MID' || exp2 === 'SENIOR')) ||
        (exp2 === 'ENTRY' && (exp1 === 'MID' || exp1 === 'SENIOR')) ||
        (exp1 === 'JUNIOR' && exp2 === 'SENIOR') ||
        (exp2 === 'JUNIOR' && exp1 === 'SENIOR')
      ) {
        // Obvious false merge risk -> keep distinct!
        return 'DISTINCT_JOB';
      }
    }

    // Rule 1: High confidence deterministic contact match + non-conflicting title
    if (
      (signals.exactUrlMatch || signals.exactContactMatch) &&
      signals.titleScore >= 0.60 &&
      signals.companyScore >= 0.60
    ) {
      return 'DUPLICATE_CONFIRMED';
    }

    // Rule 2: Multi-signal fuzzy match using configurable thresholds
    // Both company AND title MUST satisfy minCompanyScore and minTitleScore
    if (
      signals.companyScore >= this.config.minCompanyScore &&
      signals.titleScore >= this.config.minTitleScore &&
      signals.overallScore >= this.config.highConfidenceThreshold
    ) {
      return 'DUPLICATE_CONFIRMED';
    }

    // Rule 3: Clear rejection based on low similarity
    if (
      signals.companyScore < 0.50 ||
      signals.titleScore < 0.45 ||
      signals.overallScore < this.config.borderlineThreshold
    ) {
      return 'DISTINCT_JOB';
    }

    // Rule 4: Borderline ambiguous cases (Scores in gray zone)
    return 'AMBIGUOUS_BORDERLINE';
  }

  /**
   * Ingests a new job post, checks against existing canonical jobs, and either merges or creates a new card.
   */
  public ingest(incoming: IngestedInput): { status: 'MERGED' | 'CREATED'; canonicalJob: CanonicalJob; reason: string } {
    let bestMatch: { job: CanonicalJob; signals: SimilaritySignals; classification: string } | null = null;
    let highestScore = -1;

    for (const existing of this.canonicalJobs) {
      // Avoid merging if exact same message from same channel is ingested twice
      const isIdenticalSource = existing.sources.some(
        s => s.sourceChannel === incoming.sourceChannel && s.sourceMessageId === incoming.sourceMessageId
      );
      if (isIdenticalSource) {
        return {
          status: 'MERGED',
          canonicalJob: existing,
          reason: 'Identical source message ID already recorded in provenance.'
        };
      }

      const signals = this.evaluateSimilarity(incoming, existing);
      const classification = this.classifyMatch(signals, incoming.job, existing);

      if (signals.overallScore > highestScore) {
        highestScore = signals.overallScore;
        bestMatch = { job: existing, signals, classification };
      }
    }

    if (bestMatch && bestMatch.classification === 'DUPLICATE_CONFIRMED') {
      // MERGE INTO CANONICAL JOB
      const target = bestMatch.job;
      this.mergeJobData(target, incoming);

      return {
        status: 'MERGED',
        canonicalJob: target,
        reason: `Matched via multi-signal confidence (Score: ${(bestMatch.signals.overallScore * 100).toFixed(1)}%).`
      };
    }

    // CREATE NEW CANONICAL RECORD
    const newCanonical = this.createCanonicalRecord(incoming);
    this.canonicalJobs.push(newCanonical);

    return {
      status: 'CREATED',
      canonicalJob: newCanonical,
      reason: bestMatch ? `Distinct vacancy (Top candidate score: ${(highestScore * 100).toFixed(1)}%).` : 'First job record.'
    };
  }

  /**
   * Merges incoming post into existing canonical record while strictly preserving provenance.
   */
  private mergeJobData(existing: CanonicalJob, incoming: IngestedInput): void {
    // 1. Add to source provenance list
    existing.sources.push({
      sourceChannel: incoming.sourceChannel,
      sourceMessageId: incoming.sourceMessageId,
      postUrl: incoming.postUrl,
      scrapedAt: incoming.scrapedAt
    });

    existing.sourceCount = existing.sources.length;
    existing.verificationStatus = existing.sourceCount > 1 ? 'MULTI_SOURCE' : 'SINGLE_SOURCE';
    existing.lastSeenAt = incoming.scrapedAt;

    // 2. Select the most complete / informative fields
    const inc = incoming.job;

    // Preserve the longest/richest description
    if (inc.description && inc.description.length > (existing.description?.length || 0)) {
      existing.description = inc.description;
    }

    // Preserve the longest/richest requirements
    if (inc.requirements && inc.requirements.length > (existing.requirements?.length || 0)) {
      existing.requirements = inc.requirements;
    }

    // Keep direct contact if the new post provides one and the existing one was missing
    if (!existing.applyUrl && inc.applyUrl) existing.applyUrl = inc.applyUrl;
    if (!existing.applyEmail && inc.applyEmail) existing.applyEmail = inc.applyEmail;
    if (!existing.applyPhone && inc.applyPhone) existing.applyPhone = inc.applyPhone;
    if (!existing.isDirectContact && inc.isDirectContact) existing.isDirectContact = true;

    // Backfill deadline if existing was null
    if (!existing.deadline && inc.deadline) {
      existing.deadline = inc.deadline;
    }

    // Backfill salary if existing was "Not Specified"
    if ((!existing.salary || existing.salary.toLowerCase().includes('not specified')) && inc.salary && !inc.salary.toLowerCase().includes('not specified')) {
      existing.salary = inc.salary;
    }
  }

  private createCanonicalRecord(incoming: IngestedInput): CanonicalJob {
    const inc = incoming.job;
    const deterministicId = crypto
      .createHash('sha256')
      .update(`${this.normalizeText(inc.company)}:${this.normalizeText(inc.title)}:${incoming.sourceChannel}:${incoming.sourceMessageId}`)
      .digest('hex')
      .slice(0, 16);

    return {
      id: deterministicId,
      title: inc.title,
      company: inc.company,
      location: inc.location,
      category: inc.category,
      employmentType: inc.employmentType,
      experienceLevel: inc.experienceLevel,
      education: inc.education,
      salary: inc.salary,
      deadline: inc.deadline,
      description: inc.description,
      requirements: inc.requirements,
      applyUrl: inc.applyUrl,
      applyEmail: inc.applyEmail,
      applyPhone: inc.applyPhone,
      isDirectContact: inc.isDirectContact,

      sourceCount: 1,
      verificationStatus: 'SINGLE_SOURCE',
      sources: [
        {
          sourceChannel: incoming.sourceChannel,
          sourceMessageId: incoming.sourceMessageId,
          postUrl: incoming.postUrl,
          scrapedAt: incoming.scrapedAt
        }
      ],
      firstSeenAt: incoming.scrapedAt,
      lastSeenAt: incoming.scrapedAt
    };
  }
}
