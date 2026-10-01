import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { SourceStatus } from '@prisma/client';

/**
 * GET /api/sources
 * Public. Returns all ACTIVE sources so the frontend can attribute job cards
 * to their originating channel or website.
 */
export const getPublicSources = async (_req: Request, res: Response): Promise<any> => {
  try {
    const sources = await prisma.source.findMany({
      where: { status: SourceStatus.ACTIVE },
      orderBy: { name: 'asc' },
      // We need the live count of linked jobs — use include, not select, so
      // _count is available on the returned objects.
      include: {
        _count: { select: { jobSources: true } },
      },
    });

    return res.json({
      data: sources.map((s) => ({
        id: s.id,
        name: s.name,
        identifier: s.identifier,
        type: s.type,
        totalJobs: s._count.jobSources,
        lastSyncAt: s.lastSyncAt,
      })),
      totalActiveSources: sources.length,
    });
  } catch (error) {
    console.error('Error fetching public sources:', error);
    return res.status(500).json({ error: 'Failed to fetch public sources' });
  }
};

/**
 * GET /api/sources/:id
 * Public. Returns basic information about a single source.
 * Used by the frontend "Sources" attribution screen.
 */
export const getPublicSourceById = async (req: Request, res: Response): Promise<any> => {
  try {
    // Express params are always strings at runtime; cast explicitly
    const id = req.params['id'] as string;

    const source = await prisma.source.findUnique({
      where: { id },
      include: {
        _count: { select: { jobSources: true } },
      },
    });

    if (!source) {
      return res.status(404).json({ error: 'Source not found' });
    }

    return res.json({
      id: source.id,
      name: source.name,
      identifier: source.identifier,
      type: source.type,
      status: source.status,
      totalJobs: source._count.jobSources,
      totalJobsScraped: source.totalJobsScraped,
      lastSyncAt: source.lastSyncAt,
    });
  } catch (error) {
    console.error('Error fetching public source by id:', error);
    return res.status(500).json({ error: 'Failed to fetch public source' });
  }
};
