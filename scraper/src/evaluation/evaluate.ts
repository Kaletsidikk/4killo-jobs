import * as fs from 'fs';
import * as path from 'path';
import { SmartDeduplicator, DEFAULT_DEDUP_CONFIG, DeduplicationConfig } from '../deduplicator';
import { StructuredJob } from '../geminiParser';

interface EvalPair {
  id: string;
  description: string;
  groundTruth: 'SAME' | 'DIFFERENT';
  trapType: string;
  jobA: StructuredJob;
  jobB: StructuredJob;
}

export function runEvaluation(config: DeduplicationConfig = DEFAULT_DEDUP_CONFIG) {
  const datasetPath = path.join(__dirname, 'dataset.json');
  const rawData = fs.readFileSync(datasetPath, 'utf-8');
  const dataset: EvalPair[] = JSON.parse(rawData);

  let trueMerges = 0;      // Ground Truth = SAME, Predicted = MERGED
  let missedDuplicates = 0; // Ground Truth = SAME, Predicted = DISTINCT/BORDERLINE
  let falseMerges = 0;     // Ground Truth = DIFFERENT, Predicted = MERGED (CRITICAL DANGER)
  let correctDistinct = 0; // Ground Truth = DIFFERENT, Predicted = DISTINCT/BORDERLINE

  console.log('\n======================================================');
  console.log('4KILLO Deduplication Precision & Safety Evaluation');
  console.log('======================================================');
  console.log(`Config: HighConfidence=${config.highConfidenceThreshold}, MinCompany=${config.minCompanyScore}, MinTitle=${config.minTitleScore}, Borderline=${config.borderlineThreshold}\n`);

  for (const pair of dataset) {
    const dedup = new SmartDeduplicator([], config);

    // Ingest job A
    dedup.ingest({
      sourceChannel: '@source_a',
      sourceMessageId: 101,
      postUrl: 'https://t.me/source_a/101',
      scrapedAt: '2026-09-29T10:00:00Z',
      job: pair.jobA,
    });

    // Ingest job B against job A
    const result = dedup.ingest({
      sourceChannel: '@source_b',
      sourceMessageId: 102,
      postUrl: 'https://t.me/source_b/102',
      scrapedAt: '2026-09-29T10:05:00Z',
      job: pair.jobB,
    });

    const predicted = result.status === 'MERGED' ? 'SAME' : 'DIFFERENT';
    const isCorrect = predicted === pair.groundTruth;

    if (pair.groundTruth === 'SAME' && predicted === 'SAME') {
      trueMerges++;
    } else if (pair.groundTruth === 'SAME' && predicted === 'DIFFERENT') {
      missedDuplicates++;
    } else if (pair.groundTruth === 'DIFFERENT' && predicted === 'SAME') {
      falseMerges++;
    } else if (pair.groundTruth === 'DIFFERENT' && predicted === 'DIFFERENT') {
      correctDistinct++;
    }

    const mark = isCorrect ? 'PASS' : (pair.groundTruth === 'DIFFERENT' && predicted === 'SAME' ? 'CRITICAL_FAIL (False Merge)' : 'MISS (Missed Duplicate)');
    console.log(`[${mark}] ${pair.id} (${pair.trapType})`);
    console.log(`   Truth: ${pair.groundTruth} | Predicted: ${predicted} | Reason: ${result.reason}`);
  }

  // Calculate Metrics
  const totalPairs = dataset.length;
  const precision = (trueMerges + falseMerges) > 0 ? (trueMerges / (trueMerges + falseMerges)) * 100 : 100;
  const recall = (trueMerges + missedDuplicates) > 0 ? (trueMerges / (trueMerges + missedDuplicates)) * 100 : 0;
  
  // F0.5 Score: weights precision twice as much as recall
  // F_beta = (1 + beta^2) * (precision * recall) / ((beta^2 * precision) + recall)
  const beta = 0.5;
  const betaSq = beta * beta;
  const p = precision / 100;
  const r = recall / 100;
  const f0_5 = (p + r) > 0 ? (1 + betaSq) * (p * r) / ((betaSq * p) + r) * 100 : 0;
  const falseMergeRate = (falseMerges / totalPairs) * 100;

  console.log('\n======================================================');
  console.log('EVALUATION RESULTS SUMMARY');
  console.log('======================================================');
  console.log(`Pairs evaluated:        ${totalPairs}`);
  console.log(`True merges (TP):       ${trueMerges}`);
  console.log(`Missed duplicates (FN): ${missedDuplicates}`);
  console.log(`False merges (FP):      ${falseMerges}  <-- SAFETY METRIC`);
  console.log(`Correct distinct (TN):  ${correctDistinct}`);
  console.log('------------------------------------------------------');
  console.log(`Precision:              ${precision.toFixed(1)}%`);
  console.log(`Recall:                 ${recall.toFixed(1)}%`);
  console.log(`F0.5 Score:             ${f0_5.toFixed(1)}%`);
  console.log(`False-Merge Rate:       ${falseMergeRate.toFixed(1)}%`);
  console.log('======================================================\n');

  return { totalPairs, trueMerges, missedDuplicates, falseMerges, correctDistinct, precision, recall, f0_5, falseMergeRate };
}

// Run if called directly
if (require.main === module) {
  runEvaluation();
}
