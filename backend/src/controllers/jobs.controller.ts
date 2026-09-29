import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

/**
 * GET /api/jobs
 * Public endpoint. Lists jobs with optional filters and pagination.
 * If a valid JWT is provided in Authorization header, each job includes an `isSaved` flag.
 *
 * Query params:
 *   search         — keyword search across title, company, description
 *   category       — exact match (e.g. "Engineering")
 *   location       — exact match (e.g. "Addis Ababa")
 *   experienceLevel — enum: ENTRY | JUNIOR | MID | SENIOR | NOT_SPECIFIED
 *   employmentType  — e.g. "Full-Time", "Part-Time", "Contract"
 *   page           — page number (default: 1)
 *   limit          — results per page (default: 10)
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

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit))); // cap at 50
    const skip = (pageNum - 1) * limitNum;

    // Build Prisma filter dynamically based on provided query params
    const where: any = {
      isActive: true, // always only show active jobs
      ...(category && { category }),
      ...(location && { location }),
      ...(employmentType && { employmentType }),
      ...(experienceLevel && { experienceLevel: experienceLevel as any }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { company: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    // Run count and jobs query in parallel for performance
    const [total, jobs] = await Promise.all([
      prisma.job.count({ where }),
      prisma.job.findMany({
        where,
        orderBy: { createdAt: 'desc' }, // newest first
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
          isDirectContact: true,
          createdAt: true,
          // Include source links so the frontend knows where the job came from
          sources: {
            select: {
              postUrl: true,
              sourceName: true,
              postedAt: true,
            },
            take: 1, // just the first/primary source
          },
        },
      }),
    ]);

    // If the user is authenticated (optional), check which jobs they've saved
    const authReq = req as AuthRequest;
    let savedJobIds = new Set<string>();

    if (authReq.user?.userId) {
      const savedJobs = await prisma.savedJob.findMany({
        where: {
          userId: authReq.user.userId,
          jobId: { in: jobs.map((j) => j.id) },
        },
        select: { jobId: true },
      });
      savedJobIds = new Set(savedJobs.map((s) => s.jobId));
    }

    // Attach isSaved flag to each job
    const jobsWithSaved = jobs.map((job) => ({
      ...job,
      isSaved: savedJobIds.has(job.id),
    }));

    return res.json({
      data: jobsWithSaved,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return res.status(500).json({ error: 'Failed to fetch jobs' });
  }
};

/**
 * GET /api/jobs/:id
 * Public endpoint. Returns a single job's full details.
 * If a valid JWT is provided, includes `isSaved` flag.
 */
export const getJobById = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;

    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        sources: {
          select: {
            postUrl: true,
            sourceName: true,
            postedAt: true,
            rawText: true,
          },
        },
      },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (!job.isActive) {
      return res.status(404).json({ error: 'Job is no longer active' });
    }

    // Check isSaved if user is authenticated
    const authReq = req as AuthRequest;
    let isSaved = false;

    if (authReq.user?.userId) {
      const saved = await prisma.savedJob.findUnique({
        where: {
          userId_jobId: {
            userId: authReq.user.userId,
            jobId: id,
          },
        },
      });
      isSaved = !!saved;
    }

    return res.json({ ...job, isSaved });
  } catch (error) {
    console.error('Error fetching job:', error);
    return res.status(500).json({ error: 'Failed to fetch job' });
  }
};
