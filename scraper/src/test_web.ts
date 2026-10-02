import * as fs from 'fs';
import * as path from 'path';
import { WebScraper, RawWebJob } from './webScraper';
import { WEB_TARGETS } from './webTargets';

async function runWebScraperTest() {
  console.log('\n======================================================');
  console.log('4KILLO Public Web Portal Ingestion Test');
  console.log('======================================================\n');

  const scraper = new WebScraper();
  const allScrapedWebJobs: RawWebJob[] = [];

  for (const target of WEB_TARGETS) {
    console.log(`[Target] ${target.name} (${target.listingUrl})`);
    
    try {
      const jobs = await scraper.scrapeTarget(target, 5);
      console.log(`Status: Successfully scraped ${jobs.length} jobs from ${target.name}`);

      if (jobs.length > 0) {
        allScrapedWebJobs.push(...jobs);
        jobs.slice(0, 3).forEach((job, idx) => {
          console.log(`  (${idx + 1}) ${job.title} | ${job.company}`);
          console.log(`      Location: ${job.location}`);
          console.log(`      Link:     ${job.detailUrl}`);
        });
      }
    } catch (err: any) {
      console.error(`  Error scraping ${target.name}:`, err.message || err);
    }
    console.log('------------------------------------------------------');
  }

  // Save extracted web jobs to scraper/scraped_web_jobs.json
  const outputPath = path.join(__dirname, '../scraped_web_jobs.json');
  fs.writeFileSync(outputPath, JSON.stringify(allScrapedWebJobs, null, 2), 'utf-8');
  console.log(`\nSaved ${allScrapedWebJobs.length} web jobs to: scraper/scraped_web_jobs.json`);
  console.log('Web scraper test completed.\n');
}

runWebScraperTest();
