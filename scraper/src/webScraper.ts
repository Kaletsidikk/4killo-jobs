import axios, { AxiosRequestConfig } from 'axios';
import * as cheerio from 'cheerio';
import { WebTarget, WEB_TARGETS } from './webTargets';
import { StructuredJob } from './geminiParser';
import { IngestedInput } from './deduplicator';

export interface RawWebJob {
  sourceName: string;
  sourceUrl: string;
  title: string;
  company: string;
  location?: string;
  deadline?: string;
  detailUrl: string;
  rawSnippet: string;
  scrapedAt: string;
}

export class PoliteWebScraper {
  private userAgents: string[] = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  ];

  /**
   * Generates realistic, human-mimicking browser headers
   */
  private getHeaders(referer?: string): Record<string, string> {
    const randomUa = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    return {
      'User-Agent': randomUa,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,am;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'cross-site',
      'Sec-Fetch-User': '?1',
      'Referer': referer || 'https://www.google.com/',
      'Cache-Control': 'max-age=0',
    };
  }

  /**
   * Human mimicry: introduces a natural jitter delay between requests (e.g. 1.5 - 3.5 seconds)
   */
  private async randomJitter(minMs = 1500, maxMs = 3500): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Fetches page HTML with polite headers, timeout, and jitter
   */
  public async fetchHtml(url: string, referer?: string): Promise<string | null> {
    try {
      await this.randomJitter();

      const config: AxiosRequestConfig = {
        headers: this.getHeaders(referer),
        timeout: 15000,
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 400,
      };

      const response = await axios.get(url, config);
      return typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    } catch (err: any) {
      console.warn(`[WebScraper] Warning fetching ${url}:`, err.message || err);
      return null;
    }
  }

  /**
   * Scrapes job listings from a defined WebTarget
   */
  public async scrapeTarget(target: WebTarget, maxItems = 10): Promise<RawWebJob[]> {
    console.log(`[WebScraper] Fetching listing from: ${target.name} (${target.listingUrl})...`);
    const html = await this.fetchHtml(target.listingUrl);
    if (!html) {
      console.warn(`[WebScraper] Could not retrieve HTML from ${target.name}`);
      return [];
    }

    const $ = cheerio.load(html);
    const jobs: RawWebJob[] = [];

    // Attempt targeted selector
    let cards = $(target.cardSelector);

    // Fallback: search for standard article / job link elements if custom selector is empty
    if (cards.length === 0) {
      cards = $('article, .job, .vacancy, a[href*="job"], a[href*="vacancy"]').parent();
    }

    cards.slice(0, maxItems).each((_, el) => {
      const card = $(el);
      let link = card.is('a') ? card.attr('href') : card.find('a').first().attr('href');
      
      if (link && !link.startsWith('http')) {
        link = new URL(link, target.baseUrl).toString();
      }

      // Extract raw text lines
      const fullText = card.text().replace(/\s+/g, ' ').trim();
      const lines = card.text().split('\n').map(l => l.trim()).filter(l => l.length > 2);
      
      const title = lines[0] || card.find('h1, h2, h3, a').first().text().trim();
      const company = lines[2] || lines[1] || target.name;
      const location = lines[3] || 'Addis Ababa, Ethiopia';

      if (title && title.length > 3 && link && link.includes('/job/')) {
        jobs.push({
          sourceName: target.name,
          sourceUrl: target.listingUrl,
          title,
          company,
          location,
          detailUrl: link,
          rawSnippet: fullText.slice(0, 300),
          scrapedAt: new Date().toISOString(),
        });
      }
    });

    console.log(`[WebScraper] Extracted ${jobs.length} candidate vacancies from ${target.name}.`);
    return jobs;
  }

  /**
   * Converts a RawWebJob into our standardized IngestedInput format ready for SmartDeduplicator
   */
  public toIngestedInput(webJob: RawWebJob, index: number): IngestedInput {
    const structured: StructuredJob = {
      isJobPost: true,
      title: webJob.title,
      company: webJob.company,
      location: webJob.location || 'Addis Ababa',
      category: 'General',
      employmentType: 'Full-time',
      experienceLevel: 'NOT_SPECIFIED',
      education: 'As specified in announcement',
      salary: 'Not Specified',
      deadline: webJob.deadline || null,
      description: webJob.rawSnippet,
      requirements: webJob.rawSnippet,
      applyUrl: webJob.detailUrl,
      isDirectContact: true,
    };

    return {
      sourceChannel: `web:${webJob.sourceName}`,
      sourceMessageId: 10000 + index,
      postUrl: webJob.detailUrl,
      scrapedAt: webJob.scrapedAt,
      job: structured,
    };
  }
}
