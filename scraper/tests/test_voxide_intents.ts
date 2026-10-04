/**
 * 4KILLO — Voxide Speech Intent Accuracy Benchmark
 * Tests 15 real-world Ethiopian spoken queries against shared/contracts/voxide.ts
 */

import { parseEthiopianVoiceIntent, SearchJobsParams } from '../../shared/contracts/voxide';

interface TestCase {
  id: number;
  input: string;
  language: 'Amharic' | 'English' | 'Amglish';
  expected: SearchJobsParams;
  description: string;
}

const TEST_CASES: TestCase[] = [
  {
    id: 1,
    input: "ለአዲስ ተመራቂ የባንክ ስራ ቦሌ አካባቢ ፈልግልኝ",
    language: "Amharic",
    expected: {
      keyword: "Bank Trainee",
      category: "Banking & Finance",
      location: "Addis Ababa",
      experienceLevel: "ENTRY",
    },
    description: "Amharic Fresh Graduate Banking job in Bole with conversational filler",
  },
  {
    id: 2,
    input: "የሞተር ሹፌር ወይም ሞተረኛ ስራ አዲስ አበባ",
    language: "Amharic",
    expected: {
      keyword: "Delivery Rider",
      category: "Logistics & Transport",
      location: "Addis Ababa",
    },
    description: "Amharic informal vocational delivery job in Addis",
  },
  {
    id: 3,
    input: "senior software developer remote work from home",
    language: "English",
    expected: {
      keyword: "Software Developer",
      category: "IT & Software",
      location: "Remote",
      experienceLevel: "SENIOR",
    },
    description: "English senior tech remote role",
  },
  {
    id: 4,
    input: "junior frontend developer ስራ መገናኛ",
    language: "Amglish",
    expected: {
      keyword: "Software Developer",
      category: "IT & Software",
      location: "Addis Ababa",
      experienceLevel: "ENTRY",
    },
    description: "Amglish code-switched tech role with sub-city landmark",
  },
  {
    id: 5,
    input: "የሂሳብ ሹም ስራ ያለ ልምድ ፒያሳ",
    language: "Amharic",
    expected: {
      keyword: "Accountant",
      category: "Banking & Finance",
      location: "Addis Ababa",
      experienceLevel: "ENTRY",
    },
    description: "Amharic formal accounting role without experience",
  },
  {
    id: 6,
    input: "የሽያጭ ባለሙያ የሙሉ ጊዜ ስራ በሀዋሳ",
    language: "Amharic",
    expected: {
      keyword: "Sales Person",
      category: "Sales & Marketing",
      location: "Hawassa",
      employmentType: "Full-time",
    },
    description: "Amharic regional city sales role full-time",
  },
  {
    id: 7,
    input: "አስተናጋጅ ሴት ስራ ካዛንቺስ",
    language: "Amharic",
    expected: {
      keyword: "Waiter / Waitress",
      category: "Hospitality & Tourism",
      location: "Addis Ababa",
    },
    description: "Amharic service role in Kazanchis sub-city",
  },
  {
    id: 8,
    input: "የነርስ ስራ 0 አመት በባህር ዳር",
    language: "Amharic",
    expected: {
      keyword: "Nurse",
      category: "Healthcare",
      location: "Bahir Dar",
      experienceLevel: "ENTRY",
    },
    description: "Amharic healthcare entry-level in Bahir Dar",
  },
  {
    id: 9,
    input: "civil engineer site engineer vacancy in adama",
    language: "English",
    expected: {
      keyword: "Site Engineer",
      category: "Engineering & Construction",
      location: "Adama",
    },
    description: "English construction vacancy in Adama",
  },
  {
    id: 10,
    input: "የቢሮ ረዳት ወይም ጸሐፊ የትርፍ ሰዓት ስራ",
    language: "Amharic",
    expected: {
      keyword: "Office Assistant",
      category: "Administration & HR",
      employmentType: "Part-time",
    },
    description: "Amharic part-time administrative secretary role",
  },
  {
    id: 11,
    input: "የጥበቃ ሰራተኛ ስራ ፈልጌ ነበር አዲስ አበባ",
    language: "Amharic",
    expected: {
      keyword: "Security Guard",
      category: "Other",
      location: "Addis Ababa",
    },
    description: "Amharic security job with polite conversational framing",
  },
  {
    id: 12,
    input: "internship for graphic design student ከቤት ሆኖ",
    language: "Amglish",
    expected: {
      keyword: "Graphic Designer",
      category: "IT & Software",
      location: "Remote",
      employmentType: "Internship",
    },
    description: "Amglish internship design remote query",
  },
  {
    id: 13,
    input: "ngo project coordinator in diredawa",
    language: "English",
    expected: {
      keyword: "Project Coordinator",
      category: "NGO & Humanitarian",
      location: "Dire Dawa",
    },
    description: "English NGO coordinator in Dire Dawa",
  },
  {
    id: 14,
    input: "የላቦራቶሪ ባለሙያ ስራ በሲኤምሲ",
    language: "Amharic",
    expected: {
      keyword: "Laboratory Technician",
      category: "Healthcare",
      location: "Addis Ababa",
    },
    description: "Amharic lab tech role in CMC area",
  },
  {
    id: 15,
    input: "ሹፌር ህዝብ 1 ስራ ሳሪስ",
    language: "Amharic",
    expected: {
      keyword: "Driver",
      category: "Logistics & Transport",
      location: "Addis Ababa",
    },
    description: "Amharic driver license category query in Saris",
  },
];

function runBenchmark() {
  console.log("=============================================================");
  console.log("   4KILLO VOXIDE INTENT NORMALIZATION BENCHMARK (15 QUERIES)  ");
  console.log("=============================================================\n");

  let passed = 0;
  const failed: number[] = [];

  for (const tc of TEST_CASES) {
    const result = parseEthiopianVoiceIntent(tc.input);

    let match = true;
    const mismatches: string[] = [];

    for (const [key, expectedVal] of Object.entries(tc.expected)) {
      const actualVal = (result as any)[key];
      if (actualVal !== expectedVal) {
        match = false;
        mismatches.push(`${key}: expected "${expectedVal}", got "${actualVal}"`);
      }
    }

    if (match) {
      passed++;
      console.log(`✅ [PASS] #${tc.id} (${tc.language}): "${tc.input}"`);
      console.log(`   -> Extracted: ${JSON.stringify(result)}`);
    } else {
      failed.push(tc.id);
      console.log(`❌ [FAIL] #${tc.id} (${tc.language}): "${tc.input}"`);
      console.log(`   -> Mismatches: ${mismatches.join(", ")}`);
    }
  }

  const accuracy = ((passed / TEST_CASES.length) * 100).toFixed(1);
  console.log("\n=============================================================");
  console.log(`RESULTS: ${passed}/${TEST_CASES.length} Passed (${accuracy}% Accuracy)`);
  console.log("=============================================================");

  if (failed.length > 0) {
    process.exit(1);
  }
}

runBenchmark();
