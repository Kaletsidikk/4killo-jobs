import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { ExperienceLevel } from '@prisma/client';
import { resolveApplyLink } from '../utils/applyLink';
import { scoreJob, compareByScore, getMatchLabel } from '../utils/jobScorer';

/**
 * Internal helper: retry a Prisma call up to `retries` times with a short
 * back-off. The Railway PostgreSQL proxy can occasionally drop a connection
 * mid-flight; this makes every handler resilient without cluttering the code.
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

// ─── GET /api/jobs ────────────────────────────────────────────────────────────
/**
 * Public. Lists active jobs with optional filters and pagination.
 * If a valid JWT is present, each result includes `isSaved: boolean`.
 *
 * Query params:
 *   search          — keyword across title, company, description
 *   category        — exact category name  (e.g. "Engineering")
 *   location        — partial match        (e.g. "Addis")
 *   experienceLevel — ENTRY | JUNIOR | MID | SENIOR | NOT_SPECIFIED
 *   employmentType  — partial match        (e.g. "Full-time")
 *   page            — default 1
 *   limit           — default 10, max 50
 */
export const getJobs = async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      search,
      category,
      location,
      experienceLevel,
      employmentType,
      page = '1',
      limit = '10',
    } = req.query as Record<string, string>;

    const pageNum  = Math.max(1, parseInt(page, 10)  || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip     = (pageNum - 1) * limitNum;

    // Validate experienceLevel enum
    const validExpLevels = Object.values(ExperienceLevel);
    const parsedExpLevel =
      experienceLevel && validExpLevels.includes(experienceLevel.toUpperCase() as ExperienceLevel)
        ? (experienceLevel.toUpperCase() as ExperienceLevel)
        : undefined;

    const where: any = {
      isActive: true,
      ...(category     && { category:       { equals: category,      mode: 'insensitive' } }),
      ...(location     && { location:       { contains: location,     mode: 'insensitive' } }),
      ...(employmentType && { employmentType: { contains: employmentType, mode: 'insensitive' } }),
      ...(parsedExpLevel && { experienceLevel: parsedExpLevel }),
      ...(search && {
        OR: [
          { title:       { contains: search, mode: 'insensitive' } },
          { company:     { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    // Sequential queries with retry to avoid parallel connection saturation
    const total = await withDbRetry(() => prisma.job.count({ where }));
    const jobs  = await withDbRetry(() =>
      prisma.job.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        select: {
          id: true,
          title: true,
          company: true,
          location: true,
          category: true,
          employmentType: true,
          experienceLevel: true,
          salary: true,
          deadline: true,
          applyUrl: true,
          applyEmail: true,
          createdAt: true,
          _count: {
            select: { sources: true }
          },
          // Primary source for the card (channel name + link)
          sources: {
            select: { postUrl: true, sourceName: true, postedAt: true },
            take: 1,
          },
        },
      })
    );

    // Optional auth: attach isSaved flag when user is logged in
    const authReq = req as AuthRequest;
    let savedJobIds = new Set<string>();
    if (authReq.user?.userId) {
      const savedJobs = await prisma.savedJob.findMany({
        where: { userId: authReq.user.userId, jobId: { in: jobs.map((j) => j.id) } },
        select: { jobId: true },
      });
      savedJobIds = new Set(savedJobs.map((s) => s.jobId));
    }

    return res.json({
      data: jobs.map((job) => {
        // ── Hop Bypass: resolve highest-priority apply link ──────────────
        const primaryPostUrl = job.sources[0]?.postUrl ?? null;
        const { applyLink, applyLinkType } = resolveApplyLink(
          job.applyUrl,
          job.applyEmail,
          primaryPostUrl,
        );
        return {
          ...job,
          sourceCount: job._count.sources,
          _count: undefined, // remove the raw prisma _count object
          isSaved: savedJobIds.has(job.id),
          applyLink,
          applyLinkType,
        };
      }),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return res.status(500).json({ error: 'Failed to fetch jobs' });
  }
};

// ─── GET /api/jobs/categories ─────────────────────────────────────────────────
/**
 * Public. Returns all distinct job categories with a count of active listings.
 * Used by the frontend to populate filter chips.
 */
export const getCategories = async (_req: Request, res: Response): Promise<any> => {
  try {
    const categories = await prisma.job.groupBy({
      by: ['category'],
      where: { isActive: true },
      _count: { category: true },
      orderBy: { _count: { category: 'desc' } },
    });

    return res.json({
      data: categories.map((c) => ({ category: c.category, count: c._count.category })),
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

// ─── GET /api/jobs/locations ──────────────────────────────────────────────────
/**
 * Public. Returns all distinct job locations with a count of active listings.
 * Used by the frontend to populate location filter chips.
 */
export const getLocations = async (_req: Request, res: Response): Promise<any> => {
  try {
    const locations = await prisma.job.groupBy({
      by: ['location'],
      where: { isActive: true },
      _count: { location: true },
      orderBy: { _count: { location: 'desc' } },
    });

    return res.json({
      data: locations.map((l) => ({ location: l.location, count: l._count.location })),
    });
  } catch (error) {
    console.error('Error fetching locations:', error);
    return res.status(500).json({ error: 'Failed to fetch locations' });
  }
};

// ─── GET /api/jobs/saved ──────────────────────────────────────────────────────
/**
 * Authenticated. Returns all jobs the current user has bookmarked,
 * ordered newest-saved first. Only active jobs are returned.
 */
export const getSavedJobs = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const savedRecords = await prisma.savedJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        job: {
          include: {
            sources: {
              select: { postUrl: true, sourceName: true, postedAt: true },
              take: 1,
            },
          },
        },
      },
    });

    const data = savedRecords
      .filter((r) => r.job && r.job.isActive)
      .map((r) => {
        // ── Hop Bypass: resolve highest-priority apply link ──────────────
        const primaryPostUrl = r.job.sources[0]?.postUrl ?? null;
        const { applyLink, applyLinkType } = resolveApplyLink(
          r.job.applyUrl,
          r.job.applyEmail,
          primaryPostUrl,
        );
        return { ...r.job, isSaved: true, savedAt: r.createdAt, applyLink, applyLinkType };
      });

    return res.json({ data, total: data.length });
  } catch (error) {
    console.error('Error fetching saved jobs:', error);
    return res.status(500).json({ error: 'Failed to fetch saved jobs' });
  }
};

// ─── GET /api/jobs/:id ────────────────────────────────────────────────────────
/**
 * Public. Returns full details for a single active job.
 * If a valid JWT is present, includes `isSaved: boolean`.
 * Returns 404 for unknown or inactive jobs.
 */
export const getJobById = async (req: Request, res: Response): Promise<any> => {
  try {
    // req.params.id is always a plain string at runtime; cast explicitly
    const id = req.params['id'] as string;

    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        _count: { select: { sources: true } },
        sources: {
          select: { postUrl: true, sourceName: true, postedAt: true, rawText: true },
        },
      },
    });

    if (!job)          return res.status(404).json({ error: 'Job not found' });
    if (!job.isActive) return res.status(404).json({ error: 'Job is no longer active' });

    const authReq = req as AuthRequest;
    let isSaved = false;
    if (authReq.user?.userId) {
      const saved = await prisma.savedJob.findUnique({
        where: { userId_jobId: { userId: authReq.user.userId, jobId: id } },
      });
      isSaved = !!saved;
    }

    // ── Hop Bypass: resolve highest-priority apply link ────────────────
    // Use the first source's postUrl as the final fallback.
    const primaryPostUrl = job.sources[0]?.postUrl ?? null;
    const { applyLink, applyLinkType } = resolveApplyLink(
      job.applyUrl,
      job.applyEmail,
      primaryPostUrl,
    );

    // Format output to match exact requirements
    const formattedJob = {
      ...job,
      sourceCount: job._count.sources,
      _count: undefined, // hide raw prisma count
      isSaved,
      applyLink,
      applyLinkType,
    };

    return res.json(formattedJob);
  } catch (error) {
    console.error('Error fetching job:', error);
    return res.status(500).json({ error: 'Failed to fetch job' });
  }
};

// ─── GET /api/jobs/for-you ───────────────────────────────────────────────────
/**
 * Authenticated. Returns active jobs ranked by relevance to the user's
 * saved Preference record using a weighted matching algorithm.
 *
 * Scoring (max 100 pts):
 *   Category match      → +40  (exact, case-insensitive)
 *   Location match      → +30  (substring, case-insensitive)
 *   Experience level    → +20  (exact enum match)
 *   Freshness (≤7 days) → +10
 *
 * Graceful degradation: if the user has no preferences set, all active
 * jobs are returned sorted by freshness only (score = 0 for all).
 *
 * Query params:
 *   page  — default 1
 *   limit — default 10, max 50
 *
 * Response per job includes:
 *   score        — 0–100 relevance score
 *   matchReasons — { category, location, experience, fresh } booleans
 *   applyLink    — resolved via Hop Bypass
 *   applyLinkType
 */
export const getForYouJobs = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.userId;

    const { page = '1', limit = '10', categories: queryCats, locations: queryLocs, experienceLevel: queryExp } = req.query as Record<string, string>;
    const pageNum  = Math.max(1, parseInt(page, 10)  || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

    // ── 1. Load user preferences (from DB if logged in, otherwise from query params) ──
    let scorerPrefs = {
      categories: queryCats ? queryCats.split(',').filter(Boolean) : [] as string[],
      locations: queryLocs ? queryLocs.split(',').filter(Boolean) : [] as string[],
      experienceLevel: queryExp || 'NOT_SPECIFIED',
    };

    if (userId) {
      const prefs = await withDbRetry(() =>
        prisma.preference.findUnique({ where: { userId } }),
      );
      if (prefs) {
        scorerPrefs = {
          categories: prefs.categories.length > 0 ? prefs.categories : scorerPrefs.categories,
          locations: prefs.locations.length > 0 ? prefs.locations : scorerPrefs.locations,
          experienceLevel: prefs.experienceLevel !== 'NOT_SPECIFIED' ? prefs.experienceLevel : scorerPrefs.experienceLevel,
        };
      }
    }

    const hasPrefs =
      scorerPrefs.categories.length > 0 ||
      scorerPrefs.locations.length > 0;

    // ── 2. Fetch all active jobs (with source postUrl for Hop Bypass) ──────────
    // We fetch everything in memory so we can sort by computed score.

    const allJobs = await withDbRetry(() =>
      prisma.job.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
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
          _count: { select: { sources: true } },
          sources: {
            select: { postUrl: true, sourceName: true, postedAt: true },
            take: 1,
          },
        },
      }),
    );

    // ── 3. Score every job against the user's preferences ─────────────────────
    const scored = allJobs.map((job) => {
      const { score, matchReasons } = scoreJob(
        {
          title:           job.title,
          category:        job.category,
          location:        job.location,
          experienceLevel: job.experienceLevel,
          createdAt:       job.createdAt,
        },
        scorerPrefs,
      );

      // Hop Bypass: resolve the best apply link
      const primaryPostUrl = job.sources[0]?.postUrl ?? null;
      const { applyLink, applyLinkType } = resolveApplyLink(
        job.applyUrl,
        job.applyEmail,
        primaryPostUrl,
      );

      return {
        ...job,
        sourceCount:  job._count.sources,
        _count:       undefined,
        score,
        matchLabel:   getMatchLabel(score),
        matchReasons,
        applyLink,
        applyLinkType,
      };
    });

    // ── 4. Sort: highest score first, then newest as tiebreaker ───────────────
    scored.sort((a, b) => compareByScore(
      { score: a.score, createdAt: a.createdAt },
      { score: b.score, createdAt: b.createdAt },
    ));

    // ── 5. Paginate ───────────────────────────────────────────────────────────
    const total     = scored.length;
    const paginated = scored.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    // ── 6. Attach isSaved flag ────────────────────────────────────────────────
    const savedJobIds = new Set<string>();
    if (paginated.length > 0) {
      const saved = await prisma.savedJob.findMany({
        where: { userId, jobId: { in: paginated.map((j) => j.id) } },
        select: { jobId: true },
      });
      saved.forEach((s) => savedJobIds.add(s.jobId));
    }

    return res.json({
      data: paginated.map((j) => ({ ...j, isSaved: savedJobIds.has(j.id) })),
      pagination: {
        total,
        page:       pageNum,
        limit:      limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
      meta: {
        hasPreferences: hasPrefs,
        scoringWeights: { category: 40, location: 30, experience: 20, fresh: 10 },
      },
    });
  } catch (error) {
    console.error('Error fetching for-you jobs:', error);
    return res.status(500).json({ error: 'Failed to fetch personalised jobs' });
  }
};

/**
 * Authenticated. Bookmarks a job for the current user.
 * Idempotent — calling it twice has no effect (upsert).
 * Returns 201 Created on success.
 */
export const saveJob = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.userId;
    const jobId  = req.params['id'] as string;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const saved = await prisma.savedJob.upsert({
      where:  { userId_jobId: { userId, jobId } },
      create: { userId, jobId },
      update: {},
    });

    return res.status(201).json({ message: 'Job saved successfully', saved });
  } catch (error) {
    console.error('Error saving job:', error);
    return res.status(500).json({ error: 'Failed to save job' });
  }
};

// ─── DELETE /api/jobs/:id/save ────────────────────────────────────────────────
/**
 * Authenticated. Removes a job from the current user's bookmarks.
 * Idempotent — safe to call even if the job was never saved.
 */
export const unsaveJob = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.userId;
    const jobId  = req.params['id'] as string;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    await prisma.savedJob.deleteMany({ where: { userId, jobId } });

    return res.json({ message: 'Job removed from saved' });
  } catch (error) {
    console.error('Error unsaving job:', error);
    return res.status(500).json({ error: 'Failed to remove job from saved' });
  }
};
