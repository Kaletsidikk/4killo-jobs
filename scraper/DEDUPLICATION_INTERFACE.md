# SmartDeduplicator Interface & Architecture Specification

> **Component:** `scraper/src/deduplicator.ts`  
> **Version:** `v0.1`  
> **Status:** Implementation Complete · Initial Benchmark Validated

---

## 1. Component Purpose & Philosophy
The **SmartDeduplicator** prevents broadcast duplicate storms across Ethiopian Telegram channels from polluting the user feed while strictly preserving source provenance and application integrity.

### Core Design Objective:
> **"False merges are catastrophic; missed duplicates are merely inconveniences."**
> A false merge actively destroys a legitimate vacancy from a job seeker's feed. Therefore, the engine strongly favors precision over recall: **if evidence is insufficient, jobs remain separate.**

---

## 2. Ingestion & Output Contract

### What Goes In (`IngestedInput`):
```typescript
export interface IngestedInput {
  sourceChannel: string;   // e.g. "@shegerjobs"
  sourceMessageId: number; // e.g. 4501
  postUrl: string;         // "https://t.me/shegerjobs/4501"
  scrapedAt: string;       // ISO 8601 timestamp
  job: StructuredJob;      // Parsed entity from Gemini/Regex
}
```

### What Comes Out (`CanonicalJob`):
```typescript
export interface CanonicalJob {
  id: string;              // Deterministic 16-char SHA256 identifier
  title: string;
  company: string;
  location: string;
  category: string;
  experienceLevel: 'ENTRY' | 'JUNIOR' | 'MID' | 'SENIOR' | 'NOT_SPECIFIED';
  salary: string;
  deadline: string | null;
  description: string;
  requirements: string;
  applyUrl?: string;
  applyEmail?: string;
  applyPhone?: string;
  isDirectContact: boolean;

  // Provenance & Deduplication Metadata
  sourceCount: number;
  verificationStatus: 'SINGLE_SOURCE' | 'MULTI_SOURCE';
  sources: SourceProvenance[];
  firstSeenAt: string;
  lastSeenAt: string;
}
```

---

## 3. Definitions of Deduplication Metadata

### `sourceCount` (Integer)
The exact number of distinct Telegram channels or web portals where this specific vacancy was observed.
* `sourceCount = 1`: Seen on only one channel so far.
* `sourceCount = 4`: Seen on 4 channels (e.g. `@shegerjobs`, `@geezjobs`, `@ethiojobs`, and a company portal).

### `verificationStatus` (`'SINGLE_SOURCE' | 'MULTI_SOURCE'`)
An honest representation of broadcast reach:
* **`'SINGLE_SOURCE'`**: The job has only been observed from one original posting.
* **`'MULTI_SOURCE'`**: The vacancy has been cross-referenced and merged across multiple distinct public sources.
*(Note: It does NOT claim independent background investigation; it accurately reflects multi-channel presence).*

### `sources` Array (`SourceProvenance[]`)
An auditable trail containing:
```json
[
  {
    "sourceChannel": "@shegerjobs",
    "sourceMessageId": 4501,
    "postUrl": "https://t.me/shegerjobs/4501",
    "scrapedAt": "2026-09-28T10:00:00Z"
  },
  {
    "sourceChannel": "@geezjobs",
    "sourceMessageId": 9812,
    "postUrl": "https://t.me/geezjobs/9812",
    "scrapedAt": "2026-09-28T10:30:00Z"
  }
]
```

---

## 4. Multi-Signal Decision Matrix

```
                      Candidate Pair
                            ↓
               [Hard Guardrail Check]
        (Seniority conflict? e.g. ENTRY vs SENIOR)
                ↙                    ↘
          YES (Conflict)        NO (Compatible)
               ↓                       ↓
         DISTINCT_JOB         [Multi-Signal Score]
                                       ↓
         ┌─────────────────────────────┼─────────────────────────────┐
         ↓                             ↓                             ↓
Deterministic Match           Fuzzy Similarity               Low Similarity
(Same URL/Email/Phone          (Overall >= 0.88               (Score < 0.65 or
 + Title/Company >= 0.60)     + Co >= 0.75 + Title >= 0.75)   Co < 0.50 / Title < 0.45)
         ↓                             ↓                             ↓
DUPLICATE_CONFIRMED           DUPLICATE_CONFIRMED               DISTINCT_JOB
         ↓                             ↓                             ↓
    [MERGE JOB]                   [MERGE JOB]                   [CREATE CARD]
```

### What Happens With Ambiguous Jobs (`AMBIGUOUS_BORDERLINE`)?
* If a pair scores in the gray zone (`0.65 <= Score < 0.88`):
  * **Default Safe Behavior:** They remain **separate distinct jobs**.
  * **Optional AI Verification Layer:** Can be routed to a constrained prompt: *"Are these two postings describing the exact same job vacancy?"*
  * If AI verification is unavailable or uncertain, the default rule holds: **Keep them separate.**

---

## 5. Configurable Hyperparameters

```typescript
export const DEFAULT_DEDUP_CONFIG: DeduplicationConfig = {
  highConfidenceThreshold: 0.88, // Conservative score to trigger fuzzy merge
  minCompanyScore: 0.75,          // Hard floor on company similarity
  minTitleScore: 0.75,            // Hard floor on title similarity
  borderlineThreshold: 0.65,      // Lower boundary of gray zone
};
```

---

## 6. Current Benchmark Status

```text
======================================================
4KILLO Deduplication Precision & Safety Evaluation
======================================================
Pairs evaluated:        8
True merges (TP):       3
Missed duplicates (FN): 0
False merges (FP):      0  <-- DESIGN SAFETY OBJECTIVE MET
Correct distinct (TN):  5
------------------------------------------------------
Precision:              100.0%
Recall:                 100.0%
F0.5 Score:             100.0%
False-Merge Rate:       0.0%
======================================================
```
* **Status:** 8/8 test pairs correctly classified with zero false merges observed in the current evaluation set.
* **Next Planned Expansion:** Expand benchmark dataset to 50–100 pairs collected from live Ethiopian channels before tuning any thresholds.
