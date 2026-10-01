import { PrismaClient, SourceType, SourceStatus, ExperienceLevel } from '@prisma/client';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Ensure environment variables are loaded
dotenv.config();

const prisma = new PrismaClient();

// Initial channel configuration with human-readable names and identifiers
const TARGET_SOURCES = [
  {
    name: 'Ethiojobs Official',
    identifier: '@ethiojobsofficial',
    type: SourceType.TELEGRAM_CHANNEL,
    status: SourceStatus.ACTIVE,
  },
  {
    name: 'Afri Work',
    identifier: '@freelance_ethio',
    type: SourceType.TELEGRAM_CHANNEL,
    status: SourceStatus.ACTIVE,
  },
  {
    name: 'Sheger Jobs',
    identifier: '@shegerjobs',
    type: SourceType.TELEGRAM_CHANNEL,
    status: SourceStatus.ACTIVE,
  },
  {
    name: 'Beleqet Jobs',
    identifier: '@BeleqetJobs',
    type: SourceType.TELEGRAM_CHANNEL,
    status: SourceStatus.ACTIVE,
  },
  {
    name: 'Harmee Jobs / Habesha Jobs',
    identifier: 'harmeejobs.com',
    type: SourceType.WEBSITE,
    status: SourceStatus.ACTIVE,
  },
];

interface ScrapedJobEntry {
  sourceChannel: string;
  sourceMessageId?: number;
  postUrl: string;
  scrapedAt: string;
  job: {
    isJobPost?: boolean;
    title: string;
    company: string;
    location: string;
    category: string;
    employmentType?: string | null;
    experienceLevel?: string | null;
    education?: string | null;
    salary?: string | null;
    deadline?: string | null;
    description: string;
    requirements?: string | null;
    applyUrl?: string | null;
    applyEmail?: string | null;
    applyPhone?: string | null;
    isDirectContact?: boolean;
  };
}

interface ScrapedWebJobEntry {
  sourceName: string;
  sourceUrl: string;
  title: string;
  company: string;
  location: string;
  detailUrl: string;
  rawSnippet: string;
  scrapedAt: string;
}

function parseExperienceLevel(level?: string | null): ExperienceLevel {
  if (!level) return ExperienceLevel.NOT_SPECIFIED;
  const upper = level.trim().toUpperCase();
  const valid = ['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'NOT_SPECIFIED'];
  return valid.includes(upper) ? (upper as ExperienceLevel) : ExperienceLevel.NOT_SPECIFIED;
}

function parseDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function findJsonFile(fileName: string): string | null {
  const possiblePaths = [
    path.resolve(process.cwd(), '../scraper', fileName),
    path.resolve(process.cwd(), '../../scraper', fileName),
    path.resolve(process.cwd(), 'scraper', fileName),
    path.resolve(__dirname, '../../scraper', fileName),
    path.resolve(__dirname, '../../../scraper', fileName),
    path.resolve(__dirname, '../scraper', fileName),
    `C:\\Users\\User\\Desktop\\4k backend\\4killo-jobs\\scraper\\${fileName}`,
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

export async function main() {
  console.log('====================================================');
  console.log('🌱 Starting 4KILLO Database Seed Process...');
  console.log('====================================================');

  // 1. Upsert Target Sources
  console.log('\n📡 Step 1: Initializing & Updating Sources...');
  const sourceMap = new Map<string, any>();

  for (const src of TARGET_SOURCES) {
    const record = await prisma.source.upsert({
      where: { identifier: src.identifier },
      update: {
        name: src.name,
        type: src.type,
        status: src.status,
      },
      create: {
        name: src.name,
        identifier: src.identifier,
        type: src.type,
        status: src.status,
        totalJobsScraped: 0,
      },
    });
    sourceMap.set(src.identifier.toLowerCase(), record);
    // Also map without '@' prefix for lenient lookup
    const rawHandle = src.identifier.replace(/^@/, '').toLowerCase();
    sourceMap.set(rawHandle, record);
    console.log(`   ✓ Source configured: ${record.name} (${record.identifier})`);
  }

  // 2. Ingest scraper/scraped_jobs.json
  const scrapedJobsFile = findJsonFile('scraped_jobs.json');
  if (!scrapedJobsFile) {
    console.error('❌ Could not locate scraper/scraped_jobs.json!');
    process.exit(1);
  }

  console.log(`\n📄 Step 2: Ingesting Telegram Scraped Jobs from:\n   ${scrapedJobsFile}`);
  const scrapedDataRaw = fs.readFileSync(scrapedJobsFile, 'utf-8');
  const scrapedJobs: ScrapedJobEntry[] = JSON.parse(scrapedDataRaw);

  let importedTelegramCount = 0;
  let skippedTelegramCount = 0;

  for (const item of scrapedJobs) {
    if (item.job && item.job.isJobPost === false) {
      console.log(`   ↷ Skipping non-job entry: ${item.job.title || 'Untitled'}`);
      skippedTelegramCount++;
      continue;
    }

    const channelIdentifier = item.sourceChannel.trim();
    const normalizedChannel = channelIdentifier.toLowerCase();
    let sourceRecord = sourceMap.get(normalizedChannel) || sourceMap.get(normalizedChannel.replace(/^@/, ''));

    // If source doesn't exist, create it dynamically
    if (!sourceRecord) {
      console.log(`   ⚠️ Discovered unlisted source ${channelIdentifier}, auto-creating...`);
      sourceRecord = await prisma.source.upsert({
        where: { identifier: channelIdentifier },
        update: {},
        create: {
          name: channelIdentifier.replace(/^@/, ''),
          identifier: channelIdentifier,
          type: SourceType.TELEGRAM_CHANNEL,
          status: SourceStatus.ACTIVE,
          totalJobsScraped: 0,
        },
      });
      sourceMap.set(normalizedChannel, sourceRecord);
    }

    // Check if this specific source post has already been recorded
    const existingJobSource = await prisma.jobSource.findFirst({
      where: {
        postUrl: item.postUrl,
      },
      include: { job: true },
    });

    const expLevel = parseExperienceLevel(item.job.experienceLevel);
    const deadlineDate = parseDate(item.job.deadline);
    const postedAtDate = parseDate(item.scrapedAt) || new Date();
    const rawText = item.job.description + (item.job.requirements ? `\n\nRequirements:\n${item.job.requirements}` : '');

    let jobRecord: any;

    if (existingJobSource) {
      // Update existing job record with fresh fields
      jobRecord = await prisma.job.update({
        where: { id: existingJobSource.jobId },
        data: {
          title: item.job.title.trim(),
          company: item.job.company.trim(),
          location: item.job.location.trim(),
          category: item.job.category.trim(),
          employmentType: item.job.employmentType || null,
          experienceLevel: expLevel,
          education: item.job.education || null,
          salary: item.job.salary || null,
          deadline: deadlineDate,
          description: item.job.description.trim(),
          requirements: item.job.requirements || null,
          applyUrl: item.job.applyUrl || null,
          applyEmail: item.job.applyEmail || null,
          applyPhone: item.job.applyPhone || null,
          isDirectContact: Boolean(item.job.isDirectContact),
          isActive: true,
        },
      });

      // Update existing JobSource
      await prisma.jobSource.update({
        where: { id: existingJobSource.id },
        data: {
          sourceId: sourceRecord.id,
          sourceName: sourceRecord.name,
          messageId: item.sourceMessageId || null,
          rawText,
          postedAt: postedAtDate,
        },
      });
      console.log(`   ↻ Updated job: "${jobRecord.title}" @ ${jobRecord.company}`);
    } else {
      // Check if duplicate job exists by title & company
      const duplicateJob = await prisma.job.findFirst({
        where: {
          title: { equals: item.job.title.trim(), mode: 'insensitive' },
          company: { equals: item.job.company.trim(), mode: 'insensitive' },
        },
      });

      if (duplicateJob) {
        jobRecord = duplicateJob;
        console.log(`   🔗 Deduplication match found: linking new source to existing job "${jobRecord.title}"`);
      } else {
        jobRecord = await prisma.job.create({
          data: {
            title: item.job.title.trim(),
            company: item.job.company.trim(),
            location: item.job.location.trim(),
            category: item.job.category.trim(),
            employmentType: item.job.employmentType || null,
            experienceLevel: expLevel,
            education: item.job.education || null,
            salary: item.job.salary || null,
            deadline: deadlineDate,
            description: item.job.description.trim(),
            requirements: item.job.requirements || null,
            applyUrl: item.job.applyUrl || null,
            applyEmail: item.job.applyEmail || null,
            applyPhone: item.job.applyPhone || null,
            isDirectContact: Boolean(item.job.isDirectContact),
            isActive: true,
          },
        });
        console.log(`   + Created job: "${jobRecord.title}" @ ${jobRecord.company}`);
      }

      await prisma.jobSource.create({
        data: {
          jobId: jobRecord.id,
          sourceId: sourceRecord.id,
          sourceName: sourceRecord.name,
          messageId: item.sourceMessageId || null,
          postUrl: item.postUrl,
          rawText,
          postedAt: postedAtDate,
        },
      });
    }

    importedTelegramCount++;
  }

  // 3. Ingest scraper/scraped_web_jobs.json if available
  const scrapedWebFile = findJsonFile('scraped_web_jobs.json');
  let importedWebCount = 0;

  if (scrapedWebFile) {
    console.log(`\n🌐 Step 3: Ingesting Web Scraped Jobs from:\n   ${scrapedWebFile}`);
    try {
      const webRaw = fs.readFileSync(scrapedWebFile, 'utf-8');
      const webJobs: ScrapedWebJobEntry[] = JSON.parse(webRaw);
      const webSourceRecord = sourceMap.get('harmeejobs.com');

      if (webSourceRecord) {
        for (const item of webJobs) {
          const cleanTitle = item.title.replace(/\t+/g, ' ').replace(/\s+Full Time$/i, '').trim();
          const cleanCompany = (item.rawSnippet.includes('Transformation Agency') ? 'Ethiopian Agricultural Transformation Agency (ATA)'
            : item.rawSnippet.includes('East Africa Bottling') ? 'East Africa Bottling Share Company'
            : item.rawSnippet.includes('Amhara Bank') ? 'Amhara Bank S.C'
            : item.company).trim();
          const cleanLocation = (item.location === 'new' ? 'Addis Ababa' : item.location).trim();

          const existingWebSource = await prisma.jobSource.findFirst({
            where: { postUrl: item.detailUrl },
          });

          if (!existingWebSource) {
            const newJob = await prisma.job.create({
              data: {
                title: cleanTitle,
                company: cleanCompany,
                location: cleanLocation,
                category: 'General Vacancies',
                employmentType: 'Full-Time',
                experienceLevel: ExperienceLevel.NOT_SPECIFIED,
                description: item.rawSnippet,
                applyUrl: item.detailUrl,
                isDirectContact: false,
                isActive: true,
              },
            });

            await prisma.jobSource.create({
              data: {
                jobId: newJob.id,
                sourceId: webSourceRecord.id,
                sourceName: webSourceRecord.name,
                postUrl: item.detailUrl,
                rawText: item.rawSnippet,
                postedAt: parseDate(item.scrapedAt) || new Date(),
              },
            });
            importedWebCount++;
            console.log(`   + Created web job: "${cleanTitle}" @ ${cleanCompany}`);
          }
        }
      }
    } catch (e: any) {
      console.warn(`   ⚠️ Warning importing web jobs: ${e.message}`);
    }
  }

  // 4. Update source statistics (totalJobsScraped and lastSyncAt)
  console.log('\n📊 Step 4: Recomputing Source Statistics...');
  const allSources = await prisma.source.findMany();
  for (const s of allSources) {
    const count = await prisma.jobSource.count({
      where: { sourceId: s.id },
    });
    await prisma.source.update({
      where: { id: s.id },
      data: {
        totalJobsScraped: count,
        lastSyncAt: new Date(),
      },
    });
    console.log(`   • ${s.name}: ${count} total jobs linked`);
  }

  const getCounts = async () => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const totalJobs = await prisma.job.count();
        const totalJobSources = await prisma.jobSource.count();
        const totalSourcesCount = await prisma.source.count();
        return [totalJobs, totalJobSources, totalSourcesCount];
      } catch (err: any) {
        if (attempt === 3) throw err;
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    return [0, 0, 0];
  };

  const [totalJobs, totalJobSources, totalSourcesCount] = await getCounts();

  console.log('\n====================================================');
  console.log('✅ Seeding Complete!');
  console.log(`   - Sources:     ${totalSourcesCount}`);
  console.log(`   - Jobs:        ${totalJobs} (Telegram: ${importedTelegramCount}, Web: ${importedWebCount})`);
  console.log(`   - Job Sources: ${totalJobSources}`);
  console.log('====================================================\n');
}

// Only execute directly if invoked as script
if (require.main === module || process.env.RUN_SEED === 'true') {
  main()
    .catch((err) => {
      console.error('❌ Error during seeding:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
