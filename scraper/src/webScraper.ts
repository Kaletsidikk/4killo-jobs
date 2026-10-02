import axios from 'axios';
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
  employmentType?: string;
  deadline?: string;
  logoUrl?: string;
  detailUrl: string;
  rawSnippet: string;
  scrapedAt: string;
  // Deep detail fields (extracted from detail page)
  fullDescription?: string;
  requirements?: string;
  directApplyUrl?: string;
  directApplyEmail?: string;
  isBypassed?: boolean;
}

export class WebScraper {
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
   * Natural jitter delay between requests (1.0 - 2.5 seconds)
   */
  private async randomJitter(minMs = 1000, maxMs = 2500): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Fetches page HTML with headers, timeout, and jitter
   */
  public async fetchHtml(url: string, referer?: string): Promise<string | null> {
    try {
      await this.randomJitter();
      const response = await axios.get(url, {
        headers: this.getHeaders(referer),
        timeout: 12000,
        maxRedirects: 5,
        validateStatus: status => status >= 200 && status < 400,
      });
      return response.data;
    } catch (err: any) {
      console.warn(`[WebScraper] Warning: Failed to fetch ${url} - ${err.message}`);
      return null;
    }
  }

  /**
   * Deep Scraper: Fetches the job detail page to extract:
   * 1. Full Job Description & Duties (formatted cleanly with bullet points)
   * 2. Key Qualifications & Requirements
   * 3. Hop-Bypass: Official employer application URL or email (e.g. vacancy.amharabank.com.et)
   */
  public async scrapeJobDetails(detailUrl: string): Promise<{
    fullDescription: string;
    requirements: string;
    directApplyUrl?: string;
    directApplyEmail?: string;
    isBypassed: boolean;
  }> {
    const html = await this.fetchHtml(detailUrl);
    if (!html) {
      return { fullDescription: '', requirements: '', isBypassed: false };
    }

    const $ = cheerio.load(html);
    const descContainer = $('.job_description, .job-description, .single-job-content, #job-details').first();

    // 1. Direct Apply / Hop-Bypass URL extraction
    let directApplyUrl: string | undefined = undefined;
    let directApplyEmail: string | undefined = undefined;
    let isBypassed = false;

    // Check application button (e.g. "Apply for job")
    const appButton = $('a.application_button, a:contains("Apply for job"), a:contains("Apply Online"), a:contains("Apply Now")').first();
    const buttonHref = appButton.attr('href');
    if (buttonHref && buttonHref.startsWith('http') && !buttonHref.includes('harmeejobs.com')) {
      directApplyUrl = buttonHref;
      isBypassed = true;
    }

    // Scan links inside description for external employer portals
    if (!directApplyUrl && descContainer.length) {
      descContainer.find('a[href^="http"]').each((_, el) => {
        const href = $(el).attr('href');
        if (
          href &&
          !href.includes('harmeejobs.com') &&
          !href.includes('facebook.com') &&
          !href.includes('t.me') &&
          !href.includes('twitter.com') &&
          !href.includes('instagram.com')
        ) {
          if (/vacancy|career|apply|form|job/i.test(href) || $(el).text().toLowerCase().includes('apply')) {
            directApplyUrl = href;
            isBypassed = true;
            return false; // stop iteration
          }
        }
      });
    }

    // Check for direct email (mailto: or regex)
    const mailtoLink = descContainer.find('a[href^="mailto:"]').first().attr('href');
    if (mailtoLink) {
      directApplyEmail = mailtoLink.replace(/^mailto:/i, '').split('?')[0].trim();
      isBypassed = true;
    } else if (descContainer.length) {
      const emailMatch = descContainer.text().match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/i);
      if (emailMatch && !emailMatch[1].includes('harmeejobs') && !emailMatch[1].includes('example')) {
        directApplyEmail = emailMatch[1].trim();
        isBypassed = true;
      }
    }

    // 2. Structured text formatting: Clean, human-like structure
    let fullDescription = '';
    let requirements = '';

    if (descContainer.length) {
      const clone = descContainer.clone();

      // Convert lists to readable bullet points
      clone.find('ul, ol').each((_, list) => {
        $(list).find('li').each((_, li) => {
          const itemText = $(li).text().trim();
          if (itemText) {
            $(li).replaceWith(`• ${itemText}\n`);
          }
        });
      });

      // Format headers and paragraphs cleanly
      clone.find('h1, h2, h3, h4, h5, h6, p').each((_, el) => {
        const text = $(el).text().trim();
        if (text) {
          $(el).replaceWith(`${text}\n\n`);
        }
      });

      const cleanText = clone.text()
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      // Split into Description vs Requirements if standard section headers exist
      const reqSplit = cleanText.split(/(?:About You|Qualifications|Requirements|Requirement Skill|Job Requirements)/i);
      if (reqSplit.length > 1) {
        fullDescription = reqSplit[0].trim();
        requirements = reqSplit.slice(1).join('\n\n').trim();
      } else {
        fullDescription = cleanText;
        requirements = 'Please refer to the full job responsibilities and instructions above.';
      }
    }

    return {
      fullDescription,
      requirements,
      directApplyUrl,
      directApplyEmail,
      isBypassed,
    };
  }

  /**
   * Scrapes a web target listing page and deep-scrapes each candidate job for complete details
   */
  public async scrapeTarget(target: WebTarget, maxItems = 5): Promise<RawWebJob[]> {
    console.log(`[WebScraper] Fetching listing from: ${target.name} (${target.listingUrl})...`);
    const html = await this.fetchHtml(target.listingUrl);
    if (!html) return [];

    const $ = cheerio.load(html);
    const candidateCards: Array<{
      title: string;
      company: string;
      location: string;
      employmentType: string;
      deadline?: string;
      logoUrl?: string;
      link: string;
      rawSnippet: string;
    }> = [];

    let cards = $(target.cardSelector);
    if (cards.length === 0) {
      cards = $('article, .job, .vacancy, a[href*="job"], a[href*="vacancy"]').parent();
    }

    cards.slice(0, maxItems).each((_, el) => {
      const card = $(el);
      let link = card.is('a') ? card.attr('href') : card.find('a').first().attr('href');
      
      if (link && !link.startsWith('http')) {
        link = new URL(link, target.baseUrl).toString();
      }

      // Extract Clean Title
      let title = card.find('.listing-title h4').clone().children().remove().end().text().replace(/\t+/g, ' ').trim();
      if (!title) {
        title = (card.find('h1, h2, h3, h4').first().text().trim() || card.find('a').first().text().trim())
          .replace(/\t+/g, ' ')
          .replace(/\s+(Full Time|Part Time|Contract)$/i, '')
          .trim();
      }

      // Extract Employment Type
      const employmentType = card.find('.listing-types-list .job-type, .job-type').text().trim() || 'Full-time';

      // Extract Company
      let company = card.find('.listing-icons li:has(i[class*="business"])').text().trim();
      if (!company) {
        const potential = card.find('.listing-icons li').filter((_, li) => {
          return !$(li).find('i[class*="location"]').length && !$(li).find('.listing-date').length;
        }).first().text().trim();
        if (potential) company = potential;
      }
      if (!company) company = target.name;

      // Extract Location
      let location = card.find('.listing-icons li:has(i[class*="location"])').text().trim();
      if (!location) {
        location = 'Addis Ababa, Ethiopia';
      }

      // Extract Deadline
      let deadline: string | undefined = undefined;
      const fullText = card.text().replace(/\s+/g, ' ').trim();
      const expiresMatch = fullText.match(/Expires:\s*([A-Za-z]+ \d{1,2}, \d{4})/i);
      if (expiresMatch) {
        deadline = expiresMatch[1];
      }

      // Extract Logo
      const logoUrl = card.find('.company_logo, img').first().attr('src') || undefined;

      if (title && title.length > 3 && link && link.includes('/job/')) {
        candidateCards.push({
          title,
          company,
          location,
          employmentType,
          deadline,
          link,
          logoUrl,
          rawSnippet: fullText.slice(0, 350),
        });
      }
    });

    console.log(`[WebScraper] Found ${candidateCards.length} vacancies on ${target.name}. Deep scraping full job details & Hop-Bypass...`);
    const jobs: RawWebJob[] = [];

    // Deep scrape details for each job card
    for (const card of candidateCards) {
      console.log(`[WebScraper] ──> Deep scraping: "${card.title}" (${card.link})`);
      const details = await this.scrapeJobDetails(card.link);

      jobs.push({
        sourceName: target.name,
        sourceUrl: target.listingUrl,
        title: card.title,
        company: card.company,
        location: card.location,
        employmentType: card.employmentType,
        deadline: card.deadline,
        detailUrl: card.link,
        logoUrl: card.logoUrl,
        rawSnippet: card.rawSnippet,
        fullDescription: details.fullDescription || card.rawSnippet,
        requirements: details.requirements,
        directApplyUrl: details.directApplyUrl,
        directApplyEmail: details.directApplyEmail,
        isBypassed: details.isBypassed,
        scrapedAt: new Date().toISOString(),
      });
    }

    console.log(`[WebScraper] Successfully processed ${jobs.length} rich job vacancies from ${target.name}.`);
    return jobs;
  }

  /**
   * Converts a RawWebJob into our standardized IngestedInput format ready for SmartDeduplicator
   */
  public toIngestedInput(webJob: RawWebJob, index: number): IngestedInput {
    // Infer experience level
    let exp: 'ENTRY' | 'JUNIOR' | 'MID' | 'SENIOR' | 'NOT_SPECIFIED' = 'NOT_SPECIFIED';
    const lowerTitle = webJob.title.toLowerCase();
    if (/intern|internship|graduate|trainee|fresh/i.test(lowerTitle)) {
      exp = 'ENTRY';
    } else if (/junior|assistant/i.test(lowerTitle)) {
      exp = 'JUNIOR';
    } else if (/senior|lead|head|director|manager|officer ii/i.test(lowerTitle)) {
      exp = 'SENIOR';
    } else if (/officer|auditor|specialist|developer/i.test(lowerTitle)) {
      exp = 'MID';
    }

    // Infer category
    let cat = 'General';
    if (/audit|bank|account|finance|teller/i.test(lowerTitle)) {
      cat = 'Banking & Finance';
    } else if (/software|developer|it |data|web|system/i.test(lowerTitle)) {
      cat = 'Tech & Software';
    } else if (/health|nurse|doctor|medical|hse/i.test(lowerTitle)) {
      cat = 'Healthcare & Safety';
    } else if (/project|program|officer|value chain|agriculture|ngo/i.test(lowerTitle)) {
      cat = 'Development & NGO';
    }

    const structured: StructuredJob = {
      isJobPost: true,
      title: webJob.title,
      company: webJob.company,
      location: webJob.location || 'Addis Ababa',
      category: cat,
      employmentType: webJob.employmentType || 'Full-time',
      experienceLevel: exp,
      education: 'As specified in announcement',
      salary: 'Not Specified',
      deadline: webJob.deadline || null,
      description: webJob.fullDescription || webJob.rawSnippet,
      requirements: webJob.requirements || webJob.rawSnippet,
      applyUrl: webJob.directApplyUrl || webJob.detailUrl,
      applyEmail: webJob.directApplyEmail,
      isDirectContact: !!(webJob.directApplyUrl || webJob.directApplyEmail),
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
