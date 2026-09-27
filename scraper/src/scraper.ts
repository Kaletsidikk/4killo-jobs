import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { TARGET_CHANNELS } from './channels';
import { GeminiJobParser, StructuredJob } from './geminiParser';

dotenv.config();

const apiId = parseInt(process.env.TELEGRAM_API_ID || '', 10);
const apiHash = process.env.TELEGRAM_API_HASH || '';
const sessionString = process.env.TELEGRAM_STRING_SESSION || '';

if (!apiId || !apiHash) {
  console.error('\n Missing TELEGRAM_API_ID or TELEGRAM_API_HASH in .env');
  process.exit(1);
}

if (!sessionString) {
  console.error('\n TELEGRAM_STRING_SESSION is missing!');
  console.log('Run `npm run login` first to authenticate with Telegram once.\n');
  process.exit(1);
}

interface IngestedJobRecord {
  sourceChannel: string;
  sourceMessageId: number;
  postUrl: string;
  scrapedAt: string;
  job: StructuredJob;
}

async function runScraper() {
  console.log('\n======================================================');
  console.log('4KILLO Telegram Ingestion & Structuring Pipeline');
  console.log('======================================================\n');

  const client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.connect();
  console.log('Connected to Telegram MTProto API.\n');

  const parser = new GeminiJobParser();
  const ingestedResults: IngestedJobRecord[] = [];

  for (const target of TARGET_CHANNELS) {
    console.log(`Ingesting from @${target.handle} (${target.name})...`);

    try {
      const entity = await client.getEntity(target.handle);
      const messages = await client.getMessages(entity, { limit: 5 });

      for (const msg of messages) {
        if (!msg.message || msg.message.trim().length < 40) {
          continue; // Skip media-only or trivial greeting messages
        }

        console.log(`   Analyzing message #${msg.id} via Gemini Flash...`);
        const structured = await parser.parsePost(msg.message);

        if (structured) {
          console.log(`   Extracted Job: "${structured.title}" at "${structured.company}"`);
          console.log(`   Location: ${structured.location} | Salary: ${structured.salary}`);
          console.log(`   Direct Contact: ${structured.applyUrl || structured.applyEmail || 'Original Post'}`);

          ingestedResults.push({
            sourceChannel: `@${target.handle}`,
            sourceMessageId: msg.id,
            postUrl: `https://t.me/${target.handle}/${msg.id}`,
            scrapedAt: new Date().toISOString(),
            job: structured,
          });
        }
      }
    } catch (err: any) {
      console.error(`   ⚠️ Failed to ingest from @${target.handle}:`, err?.message || err);
    }
  }

  // Save extracted jobs to demo JSON for Backend & Frontend members to consume
  const outputPath = path.resolve(__dirname, '../scraped_jobs.json');
  fs.writeFileSync(outputPath, JSON.stringify(ingestedResults, null, 2), 'utf8');

  console.log('\n======================================================');
  console.log(` Pipeline Finished! Successfully extracted ${ingestedResults.length} structured jobs.`);
  console.log(` Seed data saved to: ${outputPath}`);
  console.log('======================================================\n');

  await client.disconnect();
}

runScraper().catch((err) => {
  console.error('Fatal Pipeline Error:', err);
  process.exit(1);
});
