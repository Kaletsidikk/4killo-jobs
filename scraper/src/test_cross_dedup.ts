import * as fs from 'fs';
import * as path from 'path';
import { SmartDeduplicator, IngestedInput, CanonicalJob } from './deduplicator';
import { WebScraper, RawWebJob } from './webScraper';

/**
 * Cross-Source Deduplication & Ingestion Verification Test
 * 
 * Verifies that:
 * 1. Both Telegram scraped jobs and Web scraped jobs parse into IngestedInput cleanly.
 * 2. SmartDeduplicator handles combined feeds without schema errors.
 * 3. Cross-platform reposts (Telegram post + Web portal post) correctly MERGE into 1 CanonicalJob.
 * 4. Multi-source provenance audit trail captures both handles and web portal URLs.
 * 5. Distinct seniority roles (e.g. IT Auditor vs Senior IT Auditor) remain separate.
 */
async function runCrossSourceDedupTest() {
  console.log('======================================================');
  console.log('  4KILLO CROSS-SOURCE DEDUPLICATION & INGESTION TEST  ');
  console.log('======================================================\n');

  const deduplicator = new SmartDeduplicator();
  const webScraper = new WebScraper();

  // 1. Load real Telegram jobs
  const telegramJobsPath = path.join(__dirname, '../scraped_jobs.json');
  const telegramInputs: IngestedInput[] = JSON.parse(fs.readFileSync(telegramJobsPath, 'utf8'));
  console.log(`[1] Loaded ${telegramInputs.length} real Telegram jobs from scraped_jobs.json`);

  // 2. Load real Web jobs
  const webJobsPath = path.join(__dirname, '../scraped_web_jobs.json');
  const rawWebJobs: RawWebJob[] = JSON.parse(fs.readFileSync(webJobsPath, 'utf8'));
  const webInputs: IngestedInput[] = rawWebJobs.map((wj, i) => webScraper.toIngestedInput(wj, i));
  console.log(`[2] Loaded and converted ${webInputs.length} real Web jobs from scraped_web_jobs.json\n`);

  // Inspect the metadata quality of the Web inputs
  console.log('--- Sample Web Input Normalized Metadata ---');
  const sampleWeb = webInputs[3]; // IT Auditor, Amhara Bank
  console.log(`  Source:     ${sampleWeb.sourceChannel}`);
  console.log(`  Title:      "${sampleWeb.job.title}"`);
  console.log(`  Company:    "${sampleWeb.job.company}"`);
  console.log(`  Location:   "${sampleWeb.job.location}"`);
  console.log(`  Category:   "${sampleWeb.job.category}"`);
  console.log(`  Experience: "${sampleWeb.job.experienceLevel}"`);
  console.log(`  Apply URL:  ${sampleWeb.job.applyUrl}\n`);

  // 3. Ingest Telegram jobs first
  console.log('[3] Ingesting Telegram jobs into SmartDeduplicator...');
  for (const input of telegramInputs) {
    deduplicator.ingest(input);
  }
  console.log(`    Total canonical jobs after Telegram batch: ${deduplicator.getCanonicalJobs().length}`);

  // 4. Ingest Web jobs
  console.log('[4] Ingesting Web jobs into SmartDeduplicator...');
  for (const input of webInputs) {
    deduplicator.ingest(input);
  }
  console.log(`    Total canonical jobs after Web batch: ${deduplicator.getCanonicalJobs().length}`);

  // 5. Cross-Source Merge Simulation:
  // Now simulate a Telegram channel (@shegerjobs) broadcasting the Amhara Bank IT Auditor vacancy
  // that was already discovered on Harmeejobs!
  console.log('\n[5] Cross-Platform Repost Test:');
  console.log('    Simulating Telegram @shegerjobs post of "IT Auditor" at "Amhara Bank"...');
  const crossSourceTelegramPost: IngestedInput = {
    sourceChannel: '@shegerjobs',
    sourceMessageId: 88120,
    postUrl: 'https://t.me/shegerjobs/88120',
    scrapedAt: new Date().toISOString(),
    job: {
      isJobPost: true,
      title: 'IT Auditor',
      company: 'Amhara Bank',
      location: 'Addis Ababa',
      category: 'Banking & Finance',
      employmentType: 'Full-time',
      experienceLevel: 'MID',
      education: 'BSc in Computer Science, IS, or Accounting',
      salary: 'Negotiable',
      deadline: '2026-10-02',
      description: 'Conduct comprehensive IT audits, risk assessments, and internal controls evaluations across banking systems.',
      requirements: 'Degree in Computer Science or Information Systems with 2+ years banking audit experience.',
      applyUrl: 'https://harmeejobs.com/job/it-auditor-7/?ref=telegram',
      isDirectContact: false,
    },
  };

  const result = deduplicator.ingest(crossSourceTelegramPost);
  console.log(`    Status: [${result.status}]`);
  console.log(`    Reason: ${result.reason}`);
  console.log(`    Canonical Job ID: ${result.canonicalJob.id}`);
  console.log(`    Source Count: ${result.canonicalJob.sourceCount}`);
  console.log(`    Verification Status: ${result.canonicalJob.verificationStatus}`);
  console.log(`    Provenance Sources:`);
  result.canonicalJob.sources.forEach((s: any, idx: number) => {
    console.log(`      (${idx + 1}) [${s.sourceChannel}] ${s.postUrl}`);
  });

  // 6. Seniority Hard Guardrail Check across sources:
  // "Senior IT Auditor" vs "IT Auditor" must remain distinct
  const allJobs = deduplicator.getCanonicalJobs();
  const itAuditorJobs = allJobs.filter((j: CanonicalJob) => j.title.toLowerCase().includes('it auditor'));
  console.log(`\n[6] Seniority Guardrail Check:`);
  console.log(`    Found ${itAuditorJobs.length} IT Auditor jobs in canonical store:`);
  itAuditorJobs.forEach((j: CanonicalJob) => {
    console.log(`      • "${j.title}" (${j.experienceLevel}) at "${j.company}" [Sources: ${j.sourceCount}]`);
  });

  const passedGuardrail = itAuditorJobs.length === 2;
  const passedCrossMerge = result.status === 'MERGED' && result.canonicalJob.sourceCount === 2;

  console.log('\n======================================================');
  console.log('TEST SUMMARY:');
  console.log(`  Cross-Platform Merge: ${passedCrossMerge ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`  Seniority Separation: ${passedGuardrail ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`  Combined Canonical Store: ${allJobs.length} total unique jobs`);
  console.log('======================================================\n');
}

runCrossSourceDedupTest().catch(console.error);
