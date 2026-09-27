import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

// Free tier: 5 requests/minute → 13s gap keeps us safely under the limit
const RATE_LIMIT_DELAY_MS = 13000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 65000; // Wait 65s on 429 (rate limit) and 503 (overload)

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

export class GeminiJobParser {
  private model: any;

  constructor() {
    this.model = genAI.getGenerativeModel({
      model: 'gemini-3.8-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
   * Uses Gemini 3.8 Flash to parse messy Amharic or English Telegram vacancy posts.
   * Includes rate-limit delay and exponential retry on 429/503.
   */
  async parsePost(rawText: string): Promise<StructuredJob | null> {
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

    // Rate-limit delay before every call to respect free-tier quota
    await this.sleep(RATE_LIMIT_DELAY_MS);

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await this.model.generateContent(prompt);
        const responseText = result.response.text();
        const parsed = JSON.parse(responseText);

        if (!parsed.isJobPost) {
          return null;
        }

        const contact = this.resolveHopBypass(rawText, parsed.applyUrl);

        return {
          ...parsed,
          applyUrl: contact.applyUrl,
          applyEmail: contact.applyEmail,
          applyPhone: contact.applyPhone,
          isDirectContact: contact.isDirectContact,
        };
      } catch (error: any) {
        const status = error?.status;

        if ((status === 429 || status === 503) && attempt < MAX_RETRIES) {
          console.warn(`   ⏳ Gemini rate limit / overload (${status}). Waiting ${RETRY_DELAY_MS / 1000}s before retry ${attempt}/${MAX_RETRIES - 1}...`);
          await this.sleep(RETRY_DELAY_MS);
        } else {
          console.error('   ❌ Gemini Parsing Error:', error?.message || error);
          return null;
        }
      }
    }

    return null;
  }
}
