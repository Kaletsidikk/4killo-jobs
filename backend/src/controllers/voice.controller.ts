import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { ExperienceLevel } from '@prisma/client';
import { parseEthiopianVoiceIntent, SearchJobsParams } from '@4killo/shared';
import { resolveApplyLink } from '../utils/applyLink';

/**
 * Internal helper: retry a Prisma call up to `retries` times with a short
 * back-off. Mirrors the pattern used in jobs.controller.ts.
 */
async function withDbRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      if (i < retries - 1) {
        await new Promise((r) => setTimeout(r, 600));
      }
    }
  }
  throw lastError;
}

/**
 * Converts a `SearchJobsParams` NLU result into a Prisma `where` clause
 * compatible with the Job model. This is the core "injection" step —
 * voice-extracted params are mapped 1-to-1 onto DB filter fields.
 *
 * Field mapping:
 *   keyword        → OR [ title, company, description ] ILIKE
 *   category       → category = (exact, insensitive)
 *   location       → location ILIKE (substring)
 *   experienceLevel→ experienceLevel = (enum exact, validated)
 *   employmentType → employmentType ILIKE (substring)
 */
export function buildVoiceWhereClause(params: SearchJobsParams): Record<string, any> {
  const validExpLevels = Object.values(ExperienceLevel);
  const parsedExpLevel =
    params.experienceLevel &&
    validExpLevels.includes(params.experienceLevel.toUpperCase() as ExperienceLevel)
      ? (params.experienceLevel.toUpperCase() as ExperienceLevel)
      : undefined;

  return {
    isActive: true,
    ...(params.category && {
      category: { equals: params.category, mode: 'insensitive' },
    }),
    ...(params.location && {
      location: { contains: params.location, mode: 'insensitive' },
    }),
    ...(params.employmentType && {
      employmentType: { contains: params.employmentType, mode: 'insensitive' },
    }),
    ...(parsedExpLevel && { experienceLevel: parsedExpLevel }),
    ...(params.keyword && {
      OR: [
        { title:       { contains: params.keyword, mode: 'insensitive' } },
        { company:     { contains: params.keyword, mode: 'insensitive' } },
        { description: { contains: params.keyword, mode: 'insensitive' } },
      ],
    }),
  };
}

// ─── POST /api/voice/search ───────────────────────────────────────────────────
/**
 * Public (optional auth for isSaved flag). Full voice-to-results pipeline:
 *
 *   1. Accept a raw spoken transcript (body: { transcript, page?, limit? })
 *   2. Parse it with `parseEthiopianVoiceIntent` → SearchJobsParams
 *   3. Inject params into a Prisma WHERE clause via `buildVoiceWhereClause`
 *   4. Execute the DB query and return job listings + applied filters
 *
 * This is the Voxide "one-shot" voice search: the client sends what the user
 * said and receives job results directly — no intermediate round-trip needed.
 *
 * Body:
 *   transcript  — raw spoken text (required)
 *   page        — pagination (default 1)
 *   limit       — results per page (default 10, max 50)
 *
 * Response:
 *   transcript    — original spoken text (echo)
 *   intent        — "searchJobs" | "clearFilters"
 *   appliedParams — the NLU-extracted SearchJobsParams (for frontend filter chips)
 *   data          — job listing array (same shape as GET /api/jobs)
 *   pagination    — { total, page, limit, totalPages }
 */
export const voiceSearch = async (req: Request, res: Response): Promise<any> => {
  try {
    const transcript: string | undefined =
      req.body?.transcript ?? req.body?.text ?? req.body?.query;

    if (typeof transcript !== 'string' || !transcript.trim()) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Field "transcript" must be provided as a non-empty string.',
      });
    }

    const rawPage  = req.body?.page  ?? '1';
    const rawLimit = req.body?.limit ?? '10';
    const pageNum  = Math.max(1, parseInt(String(rawPage),  10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(String(rawLimit), 10) || 10));
    const skip     = (pageNum - 1) * limitNum;

    // ── Step 1: NLU — parse raw transcript into typed search params ────────────
    const params: SearchJobsParams = parseEthiopianVoiceIntent(transcript);

    // Detect "clear filters" intent (no actionable params extracted)
    const isEmpty =
      !params.keyword &&
      !params.category &&
      !params.location &&
      !params.experienceLevel &&
      !params.employmentType;

    if (
      isEmpty &&
      /(reset|clear|ሁሉንም አሳየኝ|ሁሉንም|ሁሉም|cancel filter)/i.test(transcript)
    ) {
      return res.json({
        transcript,
        intent:        'clearFilters',
        appliedParams: {},
        data:          [],
        pagination:    { total: 0, page: pageNum, limit: limitNum, totalPages: 0 },
        message:       'Filters cleared. Fetch /api/jobs to load all jobs.',
      });
    }

    // ── Step 2: Injection — map NLU params into Prisma WHERE clause ────────────
    const where = buildVoiceWhereClause(params);

    // ── Step 3: Query DB ───────────────────────────────────────────────────────
    const total = await withDbRetry(() => prisma.job.count({ where }));
    const jobs  = await withDbRetry(() =>
      prisma.job.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        select: {
          id:              true,
          title:           true,
          company:         true,
          location:        true,
          category:        true,
          employmentType:  true,
          experienceLevel: true,
          salary:          true,
          deadline:        true,
          applyUrl:        true,
          applyEmail:      true,
          createdAt:       true,
          _count:  { select: { sources: true } },
          sources: { select: { postUrl: true, sourceName: true, postedAt: true }, take: 1 },
        },
      }),
    );

    // ── Step 4: Optional auth — attach isSaved flag ────────────────────────────
    const authReq = req as AuthRequest;
    let savedJobIds = new Set<string>();
    if (authReq.user?.userId) {
      const saved = await prisma.savedJob.findMany({
        where: { userId: authReq.user.userId, jobId: { in: jobs.map((j) => j.id) } },
        select: { jobId: true },
      });
      savedJobIds = new Set(saved.map((s) => s.jobId));
    }

    // ── Step 5: Resolve apply links + shape response ───────────────────────────
    const data = jobs.map((job) => {
      const primaryPostUrl = job.sources[0]?.postUrl ?? null;
      const { applyLink, applyLinkType } = resolveApplyLink(
        job.applyUrl,
        job.applyEmail,
        primaryPostUrl,
      );
      return {
        ...job,
        sourceCount: job._count.sources,
        _count:      undefined,
        isSaved:     savedJobIds.has(job.id),
        applyLink,
        applyLinkType,
      };
    });

    return res.json({
      transcript,
      intent:        'searchJobs',
      appliedParams: params,
      data,
      pagination: {
        total,
        page:       pageNum,
        limit:      limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    console.error('[voice/search] Error:', error);
    return res.status(500).json({ error: 'Failed to execute voice search' });
  }
};

// ─── GET /api/voice/search ────────────────────────────────────────────────────
/**
 * Public. Voxide deep-link / GET-compatible variant of the voice search.
 * Accepts the transcript as the `q` (or `transcript`) query-string param
 * so Voxide mini-app deep-links can trigger searches directly.
 *
 * Query params:
 *   q / transcript — spoken text (required)
 *   page, limit    — pagination (optional, same defaults as POST)
 */
export const voiceSearchGet = async (req: Request, res: Response): Promise<any> => {
  // Bridge GET query-string into the same body shape and reuse POST handler
  req.body = {
    transcript: req.query['q'] ?? req.query['transcript'],
    page:       req.query['page'],
    limit:      req.query['limit'],
  };
  return voiceSearch(req, res);
};
