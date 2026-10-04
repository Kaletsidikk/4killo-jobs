import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';

dotenv.config();

export interface StructuredJob {
  isJobPost: boolean;
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
}

interface KeyEntry {
  key: string;
  client: GoogleGenerativeAI;
  cooldownUntil: number;
}

/**
 * High-Throughput Multi-Key Gemini Parser with Instant Failover
 * 
 * Features:
 * 1. Multi-key pool via GEMINI_API_KEYS (comma-separated) or GEMINI_API_KEY.
 * 2. Stable high-quota models: gemini-2.0-flash with fallback to gemini-1.5-flash (1,500 req/day per key).
 * 3. Instant failover: If Key A hits 429, Key B takes over immediately without waiting.
 * 4. Heuristic pre-filter: Discards non-job posts locally in 0ms to preserve quota.
 * 5. In-memory hash cache: Prevents re-calling Gemini on duplicate Telegram broadcasts.
 */
export class GeminiJobParser {
  private keyPool: KeyEntry[] = [];
  private currentKeyIndex = 0;
  private postCache = new Map<string, StructuredJob | null>();
  private readonly models = [
    'gemini-flash-lite-latest',
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
  ];

  constructor() {
    this.initKeyPool();
  }

  private initKeyPool() {
    const rawKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
    const keys = rawKeys
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 10);

    const uniqueKeys = Array.from(new Set(keys));

    if (uniqueKeys.length === 0) {
      console.warn('[GeminiPool] No valid GEMINI_API_KEY or GEMINI_API_KEYS found in environment.');
    } else {
      console.log(`[GeminiPool] Initialized pool with ${uniqueKeys.length} active API key(s).`);
    }

    this.keyPool = uniqueKeys.map((key) => ({
      key,
      client: new GoogleGenerativeAI(key),
      cooldownUntil: 0,
    }));
  }

  private getNextAvailableKey(): KeyEntry | null {
    if (this.keyPool.length === 0) return null;

    const now = Date.now();
    for (let i = 0; i < this.keyPool.length; i++) {
      const idx = (this.currentKeyIndex + i) % this.keyPool.length;
      const candidate = this.keyPool[idx];
      if (candidate.cooldownUntil <= now) {
        this.currentKeyIndex = (idx + 1) % this.keyPool.length;
        return candidate;
      }
    }

    // All keys currently in cooldown — return the one that expires soonest
    const sorted = [...this.keyPool].sort((a, b) => a.cooldownUntil - b.cooldownUntil);
    return sorted[0];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Fast local heuristic: Discards non-job announcements in 0ms to conserve API quota
   */
  private looksLikeJobPost(text: string): boolean {
    if (!text || text.trim().length < 40) return false;

    // English job keywords
    const enPattern = /\b(job|jobs|vacancy|vacancies|hiring|position|career|careers|salary|qualification|qualifications|experience|requirements|degree|diploma|apply|deadline|full-time|part-time|internship|officer|manager|assistant|engineer|specialist|auditor)\b/i;

    // Amharic job keywords
    const amPattern = /(ሥራ|የሥራ|ክፍት|ደመወዝ|ተፈላጊ|ችሎታ|ማመልከቻ|ልምድ|ተመራቂ|ምዝገባ|ባንክ|ድርጅት|የስራ)/;

    return enPattern.test(text) || amPattern.test(text);
  }

  /**
   * Cleans referral links and isolates true direct employer contacts
   */
  private resolveHopBypass(rawText: string, detectedUrl?: string): { applyUrl?: string; applyEmail?: string; applyPhone?: string; isDirectContact: boolean } {
    const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const phoneMatch = rawText.match(/(\+2519\d{8}|09\d{8}|\+2517\d{8}|07\d{8})/);

    let cleanUrl = detectedUrl;
    const isBotRedirect = detectedUrl ? /t\.me\/(.*)bot\?start=/i.test(detectedUrl) : false;

    if (isBotRedirect) {
      cleanUrl = undefined;
    }

    const isDirect = Boolean(cleanUrl || emailMatch || phoneMatch);

    return {
      applyUrl: cleanUrl,
      applyEmail: emailMatch ? emailMatch[0] : undefined,
      applyPhone: phoneMatch ? phoneMatch[0] : undefined,
      isDirectContact: isDirect,
    };
  }

  /**
   * Parses messy Amharic or English Telegram vacancy posts using multi-key failover
   */
  async parsePost(rawText: string): Promise<StructuredJob | null> {
    // 1. Fast heuristic pre-filter (saves quota)
    if (!this.looksLikeJobPost(rawText)) {
      return null;
    }

    // 2. Cache check (prevents re-parsing identical posts across channels)
    const hash = crypto.createHash('md5').update(rawText.trim().toLowerCase()).digest('hex');
    if (this.postCache.has(hash)) {
      return this.postCache.get(hash) || null;
    }

    const prompt = `You are an expert Ethiopian Labor Market Data Parser.
Analyze the following Telegram post. It may be written in English, Amharic, or a mix.
Determine if it is a legitimate job vacancy advertisement.

If it is NOT a job advertisement (e.g. an announcement, news, tip, or ad for goods), return:
{"isJobPost": false}

If it IS a job vacancy, extract all available fields into this exact JSON schema:
{
  "isJobPost": true,
  "title": "Exact standard job title",
  "company": "Hiring company or organization name",
  "location": "Addis Ababa (mention sub-city if known) or Regional City or Remote",
  "category": "Normalized sector (e.g. IT & Software, Banking & Finance, Engineering, Healthcare, NGO, Marketing, Administration)",
  "employmentType": "Full-time, Part-time, Contract, or Internship",
  "experienceLevel": "ENTRY, JUNIOR, MID, SENIOR, or NOT_SPECIFIED",
  "education": "Required degree or certificate",
  "salary": "Specified salary in ETB or 'Not Specified' or 'Negotiable'",
  "deadline": "YYYY-MM-DD format if date is mentioned, or null if expired or missing",
  "description": "Clean summary of the job role and duties",
  "requirements": "Key qualifications, skills, and years of experience",
  "applyUrl": "Direct application URL or Google Form link if mentioned, or null"
}

Telegram Post Content:
"""
${rawText}
"""`;

    // Try available keys and fallback models
    const maxAttempts = Math.max(this.keyPool.length * 2, 4);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const keyEntry = this.getNextAvailableKey();
      if (!keyEntry) {
        console.warn('[GeminiPool] No API keys configured.');
        return null;
      }

      // If the selected key is currently cooling down, wait for it
      const waitTime = keyEntry.cooldownUntil - Date.now();
      if (waitTime > 0) {
        const sleepSec = Math.min(Math.ceil(waitTime / 1000), 20);
        console.log(`[GeminiPool] All keys throttled. Waiting ${sleepSec}s for cooldown...`);
        await this.sleep(sleepSec * 1000);
      }

      // Try models in order: gemini-2.0-flash first, then gemini-1.5-flash
      for (const modelName of this.models) {
        try {
          const model = keyEntry.client.getGenerativeModel({
            model: modelName,
            generationConfig: {
              responseMimeType: 'application/json',
            },
          });

          // Polite pacing: 3 seconds
          await this.sleep(3000);

          const result = await model.generateContent(prompt);
          const responseText = result.response.text();
          const parsed = JSON.parse(responseText);

          if (!parsed.isJobPost) {
            this.postCache.set(hash, null);
            return null;
          }

          const contact = this.resolveHopBypass(rawText, parsed.applyUrl);
          const structured: StructuredJob = {
            ...parsed,
            applyUrl: contact.applyUrl,
            applyEmail: contact.applyEmail,
            applyPhone: contact.applyPhone,
            isDirectContact: contact.isDirectContact,
          };

          this.postCache.set(hash, structured);
          return structured;
        } catch (error: any) {
          const status = error?.status;
          const msg = error?.message || '';
          const isDailyQuota = msg.includes('quota exceeded') || msg.includes('QuotaFailure') || msg.includes('exceeded your current quota');
          if (isDailyQuota) {
            // Out of daily quota (e.g. 20 req/day limit reached). Cool down for 12 hours so it doesn't waste attempts.
            keyEntry.cooldownUntil = Date.now() + 12 * 60 * 60 * 1000;
            console.warn(`[GeminiPool] Key (...${keyEntry.key.slice(-4)}) daily quota reached. Marked offline for 12h.`);
            break;
          } else if (status === 429 || status === 503 || msg.includes('Too Many Requests')) {
            // Temporary spike / rate limit — cool down for 15s
            keyEntry.cooldownUntil = Date.now() + 15000;
            console.warn(`[GeminiPool] Key (...${keyEntry.key.slice(-4)}) temporary overload [status ${status}]. Cooldown 15s.`);
            break;
          } else {
            console.error(`[GeminiPool] Parsing error on ${modelName}:`, msg);
          }
        }
      }
    }

    // 3. Fallback Heuristic Parser: Ensures 100% pipeline uptime even during AI outages/quotas
    console.log('[GeminiPool] AI parser unavailable. Applying heuristic regex fallback parser...');
    const fallback = this.fallbackRegexParse(rawText);
    this.postCache.set(hash, fallback);
    return fallback;
  }

  /**
   * Resilient fallback parser: Extracts vacancy fields using regex patterns and hop-bypass
   * when LLM API keys are exhausted or experiencing transient outages.
   */
  private fallbackRegexParse(rawText: string): StructuredJob {
    const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
    const title = lines[0]?.replace(/[#*•-]/g, '').trim() || 'Job Vacancy';
    const contact = this.resolveHopBypass(rawText);

    // Heuristic sector mapping
    let category = 'Other';
    if (/software|developer|programmer|frontend|backend|react|flutter|fullstack|node|python|ai|ml/i.test(rawText)) {
      category = 'IT & Software';
    } else if (/bank|banking|finance|accountant|auditor|cashier|teller/i.test(rawText)) {
      category = 'Banking & Finance';
    } else if (/health|nurse|doctor|medical|hospital|pharmacy/i.test(rawText)) {
      category = 'Healthcare';
    } else if (/engineer|civil|electrical|mechanical|construction/i.test(rawText)) {
      category = 'Engineering';
    } else if (/ngo|humanitarian|aid|specialist|officer|relief/i.test(rawText)) {
      category = 'NGO';
    } else if (/sales|marketing|business|manager|lead/i.test(rawText)) {
      category = 'Marketing & Sales';
    }

    // Heuristic company name
    let company = 'Telegram Employer';
    const companyMatch = rawText.match(/(?:company|organization|employer|organization|at|for|ድርጅት|ተቋም)\s*[:፡\-]?\s*([A-Za-z0-9\s&,.]{3,40})/i);
    if (companyMatch && companyMatch[1]?.trim()) {
      company = companyMatch[1].trim();
    }

    // Heuristic location
    let location = 'Addis Ababa, Ethiopia';
    if (/remote|online|work from home/i.test(rawText)) {
      location = 'Remote';
    } else if (/hawassa|hawasa/i.test(rawText)) {
      location = 'Hawassa, Ethiopia';
    } else if (/adama|nazret/i.test(rawText)) {
      location = 'Adama, Ethiopia';
    } else if (/bahir dar|bahirdar/i.test(rawText)) {
      location = 'Bahir Dar, Ethiopia';
    }

    // Heuristic deadline
    let deadline: string | null = null;
    const deadlineMatch = rawText.match(/(?:deadline|date|ማብቂያ)\s*[:፡\-]?\s*(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4})/i);
    if (deadlineMatch) {
      deadline = deadlineMatch[1];
    }

    return {
      isJobPost: true,
      title: title.slice(0, 100),
      company: company.slice(0, 80),
      location,
      category,
      employmentType: /intern|internship/i.test(rawText) ? 'Internship' : /part[- ]time/i.test(rawText) ? 'Part-time' : 'Full-time',
      experienceLevel: /entry|fresh|graduate|0 year|0 yr/i.test(rawText) ? 'ENTRY' : /senior|lead|head/i.test(rawText) ? 'SENIOR' : 'NOT_SPECIFIED',
      education: 'See details in job post',
      salary: 'Not Specified',
      deadline,
      description: rawText.slice(0, 1200),
      requirements: 'See original post for full criteria and qualifications',
      applyUrl: contact.applyUrl,
      applyEmail: contact.applyEmail,
      applyPhone: contact.applyPhone,
      isDirectContact: contact.isDirectContact,
    };
  }
}
