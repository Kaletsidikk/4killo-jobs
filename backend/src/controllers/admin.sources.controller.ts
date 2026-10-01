import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { SourceType, SourceStatus } from '@prisma/client';
import { exec } from 'child_process';
import path from 'path';

/**
 * GET /api/admin/sources
 * Admin: list all sources with job counts and aggregate stats.
 *
 * Query params:
 *   type   — filter by SourceType  (TELEGRAM_CHANNEL | TELEGRAM_GROUP | WEBSITE)
 *   status — filter by SourceStatus (ACTIVE | PAUSED | ERROR)
 *   search — search by name or identifier (case-insensitive)
 */
export const getSources = async (req: Request, res: Response): Promise<any> => {
  try {
    const { type, status, search } = req.query as Record<string, string>;

    const where: any = {
      ...(type && { type: type as SourceType }),
      ...(status && { status: status as SourceStatus }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { identifier: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const sources = await prisma.source.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { jobSources: true } },
      },
    });

    const totalJobsLinked = sources.reduce((sum, s) => sum + (s._count?.jobSources ?? 0), 0);

    return res.json({
      sources,
      stats: {
        totalSources: sources.length,
        activeSources: sources.filter((s) => s.status === SourceStatus.ACTIVE).length,
        pausedSources: sources.filter((s) => s.status === SourceStatus.PAUSED).length,
        errorSources: sources.filter((s) => s.status === SourceStatus.ERROR).length,
        totalJobsLinked,
      },
    });
  } catch (error) {
    console.error('Error fetching sources:', error);
    return res.status(500).json({ error: 'Failed to fetch sources' });
  }
};

/**
 * GET /api/admin/sources/:id
 * Admin: full source details + 10 most recent jobs scraped from it.
 */
export const getSourceById = async (req: Request, res: Response): Promise<any> => {
  try {
    // Cast to string — Express param is always a string at runtime
    const id = req.params['id'] as string;

    const source = await prisma.source.findUnique({
      where: { id },
      include: {
        _count: { select: { jobSources: true } },
        jobSources: {
          take: 10,
          orderBy: { postedAt: 'desc' },
          include: {
            job: {
              select: {
                id: true,
                title: true,
                company: true,
                location: true,
                category: true,
                salary: true,
                deadline: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!source) {
      return res.status(404).json({ error: 'Source not found' });
    }

    return res.json(source);
  } catch (error) {
    console.error('Error fetching source by id:', error);
    return res.status(500).json({ error: 'Failed to fetch source' });
  }
};

/**
 * POST /api/admin/sources
 * Admin: create a new scraping source.
 * Body: { name, identifier, type?, status? }
 */
export const addSource = async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, identifier, type, status } = req.body as Record<string, string | undefined>;

    if (!name || !identifier) {
      return res.status(400).json({ error: 'Name and identifier are required' });
    }

    const trimmedIdentifier = (identifier as string).trim();
    const trimmedName = (name as string).trim();

    // Validate type
    const validTypes = Object.values(SourceType);
    const sourceType: SourceType =
      type && validTypes.includes(type as SourceType)
        ? (type as SourceType)
        : SourceType.TELEGRAM_CHANNEL;
    if (type && !validTypes.includes(type as SourceType)) {
      return res.status(400).json({ error: `Invalid source type. Must be one of: ${validTypes.join(', ')}` });
    }

    // Validate status
    const validStatuses = Object.values(SourceStatus);
    const sourceStatus: SourceStatus =
      status && validStatuses.includes(status as SourceStatus)
        ? (status as SourceStatus)
        : SourceStatus.ACTIVE;
    if (status && !validStatuses.includes(status as SourceStatus)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const existing = await prisma.source.findUnique({ where: { identifier: trimmedIdentifier } });
    if (existing) {
      return res.status(409).json({ error: 'A source with this identifier already exists' });
    }

    const source = await prisma.source.create({
      data: { name: trimmedName, identifier: trimmedIdentifier, type: sourceType, status: sourceStatus },
    });

    return res.status(201).json(source);
  } catch (error) {
    console.error('Error adding source:', error);
    return res.status(500).json({ error: 'Failed to add source' });
  }
};

/**
 * PUT /api/admin/sources/:id
 * Admin: update any editable fields on a source.
 * Body (all optional): { name, identifier, type, status, errorMessage }
 */
export const updateSource = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params['id'] as string;
    const { name, identifier, type, status, errorMessage } = req.body as Record<string, string | undefined>;

    const existing = await prisma.source.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Source not found' });
    }

    // Conflict check when identifier is being changed
    if (identifier && (identifier as string).trim() !== existing.identifier) {
      const conflict = await prisma.source.findUnique({ where: { identifier: (identifier as string).trim() } });
      if (conflict && conflict.id !== id) {
        return res.status(409).json({ error: 'Another source is already using this identifier' });
      }
    }

    const updated = await prisma.source.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: (name as string).trim() }),
        ...(identifier !== undefined && { identifier: (identifier as string).trim() }),
        ...(type !== undefined && { type: type as SourceType }),
        ...(status !== undefined && { status: status as SourceStatus }),
        ...(errorMessage !== undefined && { errorMessage: errorMessage as string }),
      },
    });

    return res.json(updated);
  } catch (error) {
    console.error('Error updating source:', error);
    return res.status(500).json({ error: 'Failed to update source' });
  }
};

/**
 * PATCH /api/admin/sources/:id/status
 * Admin: quickly set source status to ACTIVE | PAUSED | ERROR.
 * Body: { status }
 */
export const toggleSourceStatus = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params['id'] as string;
    const { status } = req.body as { status?: string };

    const validStatuses = Object.values(SourceStatus);
    if (!status || !validStatuses.includes(status as SourceStatus)) {
      return res.status(400).json({
        error: `A valid status is required. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const source = await prisma.source.update({
      where: { id },
      data: { status: status as SourceStatus },
    });

    return res.json({ message: `Source status updated to ${status}`, source });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Source not found' });
    }
    console.error('Error updating source status:', error);
    return res.status(500).json({ error: 'Failed to update source status' });
  }
};

/**
 * DELETE /api/admin/sources/:id
 * Admin: permanently remove a source record.
 * JobSource rows referencing this source are cascade-deleted by the DB.
 */
export const deleteSource = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params['id'] as string;

    const existing = await prisma.source.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Source not found' });
    }

    await prisma.source.delete({ where: { id } });

    return res.json({ message: 'Source deleted successfully', deletedId: id });
  } catch (error) {
    console.error('Error deleting source:', error);
    return res.status(500).json({ error: 'Failed to delete source' });
  }
};

/**
 * POST /api/admin/sources/:id/sync
 * Admin: refresh the source's totalJobsScraped counter and lastSyncAt timestamp
 * by querying actual JobSource rows in the DB.
 */
export const syncSource = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params['id'] as string;

    const source = await prisma.source.findUnique({ where: { id } });
    if (!source) {
      return res.status(404).json({ error: 'Source not found' });
    }

    const count = await prisma.jobSource.count({ where: { sourceId: id } });

    const updatedSource = await prisma.source.update({
      where: { id },
      data: { totalJobsScraped: count, lastSyncAt: new Date(), errorMessage: null },
    });

    return res.json({
      message: `Sync completed for source "${updatedSource.name}"`,
      source: updatedSource,
      totalJobsLinked: count,
    });
  } catch (error) {
    console.error('Error syncing source:', error);
    return res.status(500).json({ error: 'Failed to sync source' });
  }
};

/**
 * POST /api/admin/sources/reload
 * Admin: Triggers the background ingestion script to load new data
 * from the scraper's JSON files into the database.
 */
export const reloadSources = async (req: Request, res: Response): Promise<any> => {
  try {
    // We return a 202 Accepted immediately so the frontend doesn't hang
    // waiting for a potentially long-running seed process.
    res.status(202).json({ message: 'Data ingestion started in the background.' });

    // Execute the seed script in a child process
    const seedScript = path.resolve(process.cwd(), 'node_modules', '.bin', 'tsx');
    const seedTarget = path.resolve(process.cwd(), 'prisma', 'seed.ts');
    
    exec(`"${seedScript}" "${seedTarget}"`, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Background Ingestion Failed:', error.message);
        return;
      }
      if (stderr) {
        console.error('⚠️ Background Ingestion Warnings:', stderr);
      }
      console.log('✅ Background Ingestion Succeeded:\n', stdout);
    });

  } catch (error) {
    console.error('Error triggering source reload:', error);
    // Only sent if it fails before res.status(202)
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to trigger reload' });
    }
  }
};
