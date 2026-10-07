import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { ExperienceLevel } from '@prisma/client';

/**
 * GET /api/admin/jobs
 * List jobs with pagination, status filters, and search.
 */
export const getAdminJobs = async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      page = '1',
      limit = '20',
      search,
      category,
      status, // 'active' | 'inactive' | 'all'
      experienceLevel,
      sourceId,
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    if (category) {
      where.category = { equals: category, mode: 'insensitive' };
    }

    if (experienceLevel) {
      where.experienceLevel = experienceLevel as ExperienceLevel;
    }

    if (sourceId) {
      where.sources = {
        some: { sourceId },
      };
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { company: { contains: q, mode: 'insensitive' } },
        { location: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, jobs] = await Promise.all([
      prisma.job.count({ where }),
      prisma.job.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          sources: {
            select: {
              sourceName: true,
              postUrl: true,
              postedAt: true,
              source: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
          _count: {
            select: { savedBy: true },
          },
        },
      }),
    ]);

    return res.json({
      jobs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching admin jobs:', error);
    return res.status(500).json({ error: 'Failed to fetch jobs' });
  }
};

/**
 * GET /api/admin/jobs/:id
 * Retrieve a single job with complete relation details.
 */
export const getAdminJobById = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params['id'] as string;

    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        sources: {
          include: {
            source: true,
          },
        },
        _count: {
          select: { savedBy: true },
        },
      },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    return res.json({ job });
  } catch (error) {
    console.error('Error fetching job details:', error);
    return res.status(500).json({ error: 'Failed to fetch job details' });
  }
};

/**
 * PATCH /api/admin/jobs/:id/status
 * Toggle or set the active status of a job (take down / restore).
 */
export const toggleJobStatus = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params['id'] as string;
    const { isActive } = req.body;

    const existing = await prisma.job.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const nextStatus = typeof isActive === 'boolean' ? isActive : !existing.isActive;

    const updated = await prisma.job.update({
      where: { id },
      data: { isActive: nextStatus },
    });

    return res.json({
      message: `Job ${nextStatus ? 'activated' : 'deactivated'} successfully`,
      job: updated,
    });
  } catch (error) {
    console.error('Error updating job status:', error);
    return res.status(500).json({ error: 'Failed to update job status' });
  }
};

/**
 * PUT /api/admin/jobs/:id
 * Update job fields (title, company, description, category, etc.).
 */
export const updateAdminJob = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params['id'] as string;
    const {
      title,
      company,
      location,
      category,
      employmentType,
      experienceLevel,
      education,
      salary,
      deadline,
      description,
      requirements,
      applyUrl,
      applyEmail,
      applyPhone,
      isDirectContact,
      isActive,
    } = req.body;

    const existing = await prisma.job.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const updated = await prisma.job.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(company !== undefined && { company }),
        ...(location !== undefined && { location }),
        ...(category !== undefined && { category }),
        ...(employmentType !== undefined && { employmentType }),
        ...(experienceLevel !== undefined && { experienceLevel: experienceLevel as ExperienceLevel }),
        ...(education !== undefined && { education }),
        ...(salary !== undefined && { salary }),
        ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
        ...(description !== undefined && { description }),
        ...(requirements !== undefined && { requirements }),
        ...(applyUrl !== undefined && { applyUrl }),
        ...(applyEmail !== undefined && { applyEmail }),
        ...(applyPhone !== undefined && { applyPhone }),
        ...(isDirectContact !== undefined && { isDirectContact }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return res.json({
      message: 'Job updated successfully',
      job: updated,
    });
  } catch (error) {
    console.error('Error updating job:', error);
    return res.status(500).json({ error: 'Failed to update job' });
  }
};

/**
 * DELETE /api/admin/jobs/:id
 * Delete a job listing (cascades to JobSource and SavedJob).
 */
export const deleteAdminJob = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params['id'] as string;

    const existing = await prisma.job.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Job not found' });
    }

    await prisma.job.delete({ where: { id } });

    return res.json({ message: 'Job deleted successfully', deletedId: id });
  } catch (error) {
    console.error('Error deleting job:', error);
    return res.status(500).json({ error: 'Failed to delete job' });
  }
};
