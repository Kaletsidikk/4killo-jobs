import { SmartDeduplicator, IngestedInput } from './deduplicator';

console.log('\n======================================================');
console.log('4KILLO Multi-Signal Job Deduplication Test Suite');
console.log('======================================================\n');

const deduplicator = new SmartDeduplicator();

// ----------------------------------------------------------------------------
// TEST 1: Same Job from Two Different Telegram Channels (Should MERGE)
// ----------------------------------------------------------------------------
const job1_channelA: IngestedInput = {
  sourceChannel: '@shegerjobs',
  sourceMessageId: 4501,
  postUrl: 'https://t.me/shegerjobs/4501',
  scrapedAt: '2026-09-28T10:00:00Z',
  job: {
    isJobPost: true,
    title: 'Senior Frontend Engineer (React)',
    company: 'Safaricom Telecommunications Ethiopia',
    location: 'Addis Ababa',
    category: 'Technology',
    employmentType: 'Full-time',
    experienceLevel: 'SENIOR',
    education: 'BSc in Computer Science or related',
    salary: 'Not Specified',
    deadline: '2026-10-15',
    description: 'Lead modern frontend architecture and build intuitive web experiences.',
    requirements: '5+ years experience in React, TypeScript, and modern state management.',
    applyEmail: 'recruitment@safaricom.et',
    isDirectContact: true,
  }
};

const job1_channelB: IngestedInput = {
  sourceChannel: '@geezjobs',
  sourceMessageId: 9812,
  postUrl: 'https://t.me/geezjobs/9812',
  scrapedAt: '2026-09-28T10:30:00Z',
  job: {
    isJobPost: true,
    title: 'Senior Frontend Engineer - React',
    company: 'Safaricom Telecommunications Ethiopia',
    location: 'Addis Ababa, Ethiopia',
    category: 'Technology',
    employmentType: 'Full-time',
    experienceLevel: 'SENIOR',
    education: 'BSc in Computer Science or related',
    salary: 'Attractive',
    deadline: '2026-10-15',
    description: 'Lead modern frontend architecture and build intuitive web experiences for our customer portals.',
    requirements: '5+ years experience in React, TypeScript, and state management.',
    applyEmail: 'recruitment@safaricom.et',
    isDirectContact: true,
  }
};

// ----------------------------------------------------------------------------
// TEST 2: Different Jobs at the SAME Company (Must NOT Merge!)
// ----------------------------------------------------------------------------
const job2_sameCompanyDifferentRole: IngestedInput = {
  sourceChannel: '@ethiojobs',
  sourceMessageId: 1204,
  postUrl: 'https://t.me/ethiojobs/1204',
  scrapedAt: '2026-09-28T11:00:00Z',
  job: {
    isJobPost: true,
    title: 'Network Operations Center (NOC) Engineer',
    company: 'Safaricom Telecommunications Ethiopia',
    location: 'Addis Ababa',
    category: 'Engineering',
    employmentType: 'Full-time',
    experienceLevel: 'MID',
    education: 'BSc in Electrical / Telecom Engineering',
    salary: 'Competitive',
    deadline: '2026-10-20',
    description: 'Monitor telecom transmission networks, core routing, and cellular base stations 24/7.',
    requirements: '3+ years experience with IP networks, fiber routing, and NOC alarms.',
    applyEmail: 'recruitment@safaricom.et',
    isDirectContact: true,
  }
};

// ----------------------------------------------------------------------------
// TEST 3: Same Job Title at TWO DIFFERENT Companies (Must NOT Merge!)
// ----------------------------------------------------------------------------
const job3_sameTitleDifferentCompany: IngestedInput = {
  sourceChannel: '@shegerjobs',
  sourceMessageId: 4505,
  postUrl: 'https://t.me/shegerjobs/4505',
  scrapedAt: '2026-09-28T11:15:00Z',
  job: {
    isJobPost: true,
    title: 'Senior Frontend Engineer (React)',
    company: 'Dashen Bank SC',
    location: 'Addis Ababa',
    category: 'Technology',
    employmentType: 'Full-time',
    experienceLevel: 'SENIOR',
    education: 'BSc in Computer Science',
    salary: 'As per Bank Scale',
    deadline: '2026-10-10',
    description: 'Develop next generation internet banking interface.',
    requirements: 'React, TypeScript, banking UI security standards.',
    applyEmail: 'jobs@dashenbank.com',
    isDirectContact: true,
  }
};

// ----------------------------------------------------------------------------
// TEST 4: CBE abbreviation test (Must NOT blindly merge with Commercial Bank without evidence)
// ----------------------------------------------------------------------------
const job4_abbreviationAmbiguity: IngestedInput = {
  sourceChannel: '@ethio_advert',
  sourceMessageId: 884,
  postUrl: 'https://t.me/ethio_advert/884',
  scrapedAt: '2026-09-28T11:30:00Z',
  job: {
    isJobPost: true,
    title: 'Administrative Assistant',
    company: 'CBE', // Could mean Commercial Bank, or Center for Basic Education, etc.
    location: 'Hawassa',
    category: 'Administration',
    employmentType: 'Contract',
    experienceLevel: 'ENTRY',
    education: 'Diploma in Secretarial Science',
    salary: '8,000 ETB',
    deadline: '2026-10-05',
    description: 'Assist daily office filing and correspondence.',
    requirements: 'Diploma and computer literacy.',
    applyPhone: '0911223344',
    isDirectContact: true,
  }
};

// RUN INGESTION TESTS
console.log('Ingesting Job 1 (Safaricom - Frontend via @shegerjobs)...');
const res1 = deduplicator.ingest(job1_channelA);
console.log(`-> Result: ${res1.status} (${res1.reason})\n`);

console.log('Ingesting Job 1 Repost (Safaricom - Frontend via @geezjobs)...');
const res2 = deduplicator.ingest(job1_channelB);
console.log(`-> Result: ${res2.status} (${res2.reason})\n`);

console.log('Ingesting Job 2 (Safaricom - NOC Engineer via @ethiojobs)...');
const res3 = deduplicator.ingest(job2_sameCompanyDifferentRole);
console.log(`-> Result: ${res3.status} (${res3.reason})\n`);

console.log('Ingesting Job 3 (Dashen Bank - Frontend via @shegerjobs)...');
const res4 = deduplicator.ingest(job3_sameTitleDifferentCompany);
console.log(`-> Result: ${res4.status} (${res4.reason})\n`);

console.log('Ingesting Job 4 (Ambiguous CBE Admin Assistant via @ethio_advert)...');
const res5 = deduplicator.ingest(job4_abbreviationAmbiguity);
console.log(`-> Result: ${res5.status} (${res5.reason})\n`);

// FINAL AUDIT
const canonicals = deduplicator.getCanonicalJobs();
console.log('======================================================');
console.log(`Total Ingested Postings: 5`);
console.log(`Resulting Canonical Jobs: ${canonicals.length} (Expected: 4)`);
console.log('======================================================\n');

for (const c of canonicals) {
  console.log(`[${c.verificationStatus}] ${c.title} at ${c.company}`);
  console.log(`   Source Count: ${c.sourceCount}`);
  console.log(`   Sources: ${c.sources.map(s => s.sourceChannel).join(', ')}`);
  console.log(`   Contact: ${c.applyEmail || c.applyPhone || c.applyUrl || 'None'}`);
  console.log('------------------------------------------------------');
}

// ASSERTIONS FOR AUTOMATED VERIFICATION
const testPassed =
  canonicals.length === 4 &&
  res1.status === 'CREATED' &&
  res2.status === 'MERGED' &&
  res3.status === 'CREATED' &&
  res4.status === 'CREATED' &&
  res5.status === 'CREATED' &&
  canonicals[0].sourceCount === 2 &&
  canonicals[0].verificationStatus === 'MULTI_SOURCE';

if (testPassed) {
  console.log('\nALL DEDUPLICATION TESTS PASSED WITH 100% ACCURACY! ');
  process.exit(0);
} else {
  console.error('\n❌ DEDUPLICATION TEST ASSERTIONS FAILED!');
  process.exit(1);
}
