import http from 'http';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { TARGET_CHANNELS } from './channels';
import { WEB_TARGETS } from './webTargets';
import { WebScraper } from './webScraper';
import { GeminiJobParser } from './geminiParser';
import { SmartDeduplicator, IngestedInput, CanonicalJob } from './deduplicator';
import { DatabasePersistence } from './dbPersistence';

dotenv.config();

/**
 * 4KILLO 24/7 Unified Ingestion & Deduplication Worker
 * 
 * Responsibilities:
 * 1. Telegram Stream: Monitors target Telegram channels in real-time.
 * 2. Web Portal Cron: Scheduled scraping of Ethiopian job portals.
 * 3. AI Structuring: Gemini Flash NER for unstructured posts.
 * 4. Deduplication Engine: Real-time multi-signal merging (Telegram + Web).
 * 5. PostgreSQL Persistence: Writes canonical jobs and multi-source provenance directly to DB.
 * 6. Railway Healthcheck: Lightweight HTTP listener for uptime probes.
 */
class UnifiedIngestionWorker {
  private client: TelegramClient | null = null;
  private webScraper: WebScraper;
  private parser: GeminiJobParser | null = null;
  private deduplicator: SmartDeduplicator;
  private dbPersistence: DatabasePersistence | null = null;
  private isRunning = false;
  private lastWebSync: Date | null = null;
  private lastTelegramSync: Date | null = null;
  private totalJobsProcessed = 0;

  private apiId = parseInt(process.env.TELEGRAM_API_ID || '', 10);
  private apiHash = process.env.TELEGRAM_API_HASH || '';
  private sessionString = process.env.TELEGRAM_STRING_SESSION || '';
  private webCronIntervalMs = (parseInt(process.env.WEB_CRON_INTERVAL_MINUTES || '30', 10)) * 60 * 1000;
  private telegramPollIntervalMs = (parseInt(process.env.TG_POLL_INTERVAL_MINUTES || '10', 10)) * 60 * 1000;

  constructor() {
    this.webScraper = new WebScraper();
    this.deduplicator = new SmartDeduplicator();
  }

  public async start() {
    console.log('======================================================');
    console.log('  4KILLO 24/7 INGESTION & DEDUPLICATION WORKER        ');
    console.log('======================================================');

    // 1. Initialize Gemini Parser
    if (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY) {
      try {
        this.parser = new GeminiJobParser();
        console.log('[Worker] Gemini Flash Parser initialized.');
      } catch (err: any) {
        console.warn(`[Worker] Gemini init warning: ${err.message}`);
      }
    } else {
      console.warn('[Worker] Warning: GEMINI_API_KEYS / GEMINI_API_KEY is not set. Telegram AI parsing will be skipped.');
    }

    // 2. Initialize Database Persistence (PostgreSQL)
    if (process.env.DATABASE_URL) {
      try {
        this.dbPersistence = new DatabasePersistence();
        console.log('[Worker] PostgreSQL persistence layer initialized.');
      } catch (err: any) {
        console.warn(`[Worker] PostgreSQL init warning: ${err.message}`);
      }
    } else {
      console.warn('[Worker] Warning: DATABASE_URL not set. Running in offline JSON mode.');
    }

    // 3. Start Health Check Server for Railway
    this.startHealthCheckServer();

    // 4. Connect Telegram MTProto Client
    await this.initTelegramClient();

    this.isRunning = true;

    // 4. Initial Synchronization Run
    await this.runFullSyncCycle();

    // 5. Schedule Recurring Sync Loops
    this.scheduleRecurringTasks();
  }

  private startHealthCheckServer() {
    const port = parseInt(process.env.PORT || '8080', 10);
    const server = http.createServer((req, res) => {
      if (req.url === '/health' || req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            status: 'healthy',
            uptimeSeconds: Math.floor(process.uptime()),
            totalCanonicalJobs: this.deduplicator.getCanonicalJobs().length,
            totalJobsProcessed: this.totalJobsProcessed,
            lastWebSync: this.lastWebSync?.toISOString() || null,
            lastTelegramSync: this.lastTelegramSync?.toISOString() || null,
          })
        );
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    server.listen(port, () => {
      console.log(`[Worker] Healthcheck server listening on port ${port}`);
    });
  }

  private async initTelegramClient() {
    if (!this.apiId || !this.apiHash || !this.sessionString) {
      console.warn('[Worker] Telegram credentials missing. Telegram listener will be disabled.');
      return;
    }

    try {
      this.client = new TelegramClient(new StringSession(this.sessionString), this.apiId, this.apiHash, {
        connectionRetries: 10,
        retryDelay: 3000,
        autoReconnect: true,
      });

      await this.client.connect();
      console.log('[Worker] Connected to Telegram MTProto session.');
    } catch (err: any) {
      console.error(`[Worker] Failed to connect to Telegram: ${err.message}`);
    }
  }

  /**
   * Runs a complete sync cycle across both Telegram channels and Web portals
   */
  public async runFullSyncCycle() {
    console.log('\n[Worker] Starting full sync cycle...');
    await this.syncWebPortals();
    await this.syncTelegramChannels();
    this.persistCanonicalJobs();
    console.log(`[Worker] Sync complete. Canonical store size: ${this.deduplicator.getCanonicalJobs().length}\n`);
  }

  /**
   * Scrapes configured web targets, extracts deep details & hop-bypass, and ingests into deduplicator
   */
  public async syncWebPortals() {
    console.log('[Worker:Web] Running scheduled web portal scrape...');
    try {
      for (const target of WEB_TARGETS) {
        const rawWebJobs = await this.webScraper.scrapeTarget(target, 5);
        for (let i = 0; i < rawWebJobs.length; i++) {
          const ingested = this.webScraper.toIngestedInput(rawWebJobs[i], i);
          const result = this.deduplicator.ingest(ingested);
          this.totalJobsProcessed++;

          // Persist directly to PostgreSQL as the single source of truth
          if (this.dbPersistence) {
            await this.dbPersistence.persistJob(result.canonicalJob, ingested, result.status);
          }

          if (result.status === 'MERGED') {
            console.log(`[Worker:Web] Merged duplicate: "${ingested.job.title}" at "${ingested.job.company}"`);
          }
        }
      }
      this.lastWebSync = new Date();
    } catch (err: any) {
      console.error(`[Worker:Web] Error during web scrape: ${err.message}`);
    }
  }

  /**
   * Polls target Telegram channels for recent vacancies
   */
  public async syncTelegramChannels() {
    if (!this.client || !this.parser) return;

    console.log('[Worker:Telegram] Checking target channels for new posts...');
    try {
      for (const target of TARGET_CHANNELS) {
        try {
          const entity = await this.client.getEntity(target.handle);
          const messages = await this.client.getMessages(entity, { limit: 5 });

          for (const msg of messages) {
            if (!msg.message || msg.message.trim().length < 40) continue;

            const structured = await this.parser.parsePost(msg.message);
            if (structured) {
              const input: IngestedInput = {
                sourceChannel: `@${target.handle}`,
                sourceMessageId: msg.id,
                postUrl: `https://t.me/${target.handle}/${msg.id}`,
                scrapedAt: new Date().toISOString(),
                job: structured,
              };

              const result = this.deduplicator.ingest(input);
              this.totalJobsProcessed++;

              // Persist directly to PostgreSQL as the single source of truth
              if (this.dbPersistence) {
                await this.dbPersistence.persistJob(result.canonicalJob, input, result.status);
              }

              if (result.status === 'MERGED') {
                console.log(`[Worker:Telegram] Merged duplicate: "${structured.title}" across sources`);
              }
            }
          }
        } catch (targetErr: any) {
          console.warn(`[Worker:Telegram] Could not read @${target.handle}: ${targetErr.message}`);
        }
      }
      this.lastTelegramSync = new Date();
    } catch (err: any) {
      console.error(`[Worker:Telegram] Error in Telegram sync: ${err.message}`);
    }
  }

  /**
   * Saves canonical jobs to disk so backend/frontend or API can consume it
   */
  private persistCanonicalJobs() {
    const jobs = this.deduplicator.getCanonicalJobs();
    const outputPath = path.resolve(__dirname, '../scraped_canonical_jobs.json');
    fs.writeFileSync(outputPath, JSON.stringify(jobs, null, 2), 'utf8');
    console.log(`[Worker] Saved ${jobs.length} canonical jobs to: ${outputPath}`);
  }

  /**
   * Sets up 24/7 background cron timers
   */
  private scheduleRecurringTasks() {
    console.log(`[Worker] Scheduling Web sync every ${this.webCronIntervalMs / 60000} mins`);
    setInterval(async () => {
      if (this.isRunning) {
        await this.syncWebPortals();
        this.persistCanonicalJobs();
      }
    }, this.webCronIntervalMs);

    console.log(`[Worker] Scheduling Telegram sync every ${this.telegramPollIntervalMs / 60000} mins`);
    setInterval(async () => {
      if (this.isRunning) {
        await this.syncTelegramChannels();
        this.persistCanonicalJobs();
      }
    }, this.telegramPollIntervalMs);
  }
}

// Start worker process
const worker = new UnifiedIngestionWorker();
worker.start().catch((err) => {
  console.error('[Worker] Fatal Error:', err);
  process.exit(1);
});
