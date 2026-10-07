import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { SourceStatus } from '@prisma/client';

/**
 * GET /api/admin/metrics
 * Returns comprehensive platform metrics and breakdown analytics.
 */
export const getAdminMetrics = async (_req: Request, res: Response): Promise<any> => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalJobs,
      activeJobs,
      inactiveJobs,
      jobsLast24h,
      jobsLast7d,
      totalUsers,
      usersLast7d,
      usersWithAlerts,
      totalBookmarks,
      totalSources,
      activeSources,
      pausedSources,
      errorSources,
      scrapedAggregation,
      categoryGroups,
      locationGroups,
      sourceTypeGroups,
    ] = await Promise.all([
      prisma.job.count(),
      prisma.job.count({ where: { isActive: true } }),
      prisma.job.count({ where: { isActive: false } }),
      prisma.job.count({ where: { createdAt: { gte: oneDayAgo } } }),
      prisma.job.count({ where: { createdAt: { gte: sevenDaysAgo } } }),

      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.preference.count({
        where: {
          OR: [{ instantAlerts: true }, { digestAlerts: true }],
        },
      }),

      prisma.savedJob.count(),

      prisma.source.count(),
      prisma.source.count({ where: { status: SourceStatus.ACTIVE } }),
      prisma.source.count({ where: { status: SourceStatus.PAUSED } }),
      prisma.source.count({ where: { status: SourceStatus.ERROR } }),
      prisma.source.aggregate({ _sum: { totalJobsScraped: true } }),

      prisma.job.groupBy({
        by: ['category'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),

      prisma.job.groupBy({
        by: ['location'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),

      prisma.source.groupBy({
        by: ['type'],
        _count: { id: true },
      }),
    ]);

    return res.json({
      summary: {
        jobs: {
          total: totalJobs,
          active: activeJobs,
          inactive: inactiveJobs,
          addedLast24h: jobsLast24h,
          addedLast7d: jobsLast7d,
        },
        users: {
          total: totalUsers,
          newLast7d: usersLast7d,
          withAlertsEnabled: usersWithAlerts,
        },
        engagement: {
          totalBookmarks,
        },
        sources: {
          total: totalSources,
          active: activeSources,
          paused: pausedSources,
          error: errorSources,
          totalScrapedAllTime: scrapedAggregation._sum.totalJobsScraped ?? 0,
        },
      },
      breakdowns: {
        categories: categoryGroups.map((g) => ({
          category: g.category,
          count: g._count.id,
        })),
        locations: locationGroups.map((g) => ({
          location: g.location,
          count: g._count.id,
        })),
        sourceTypes: sourceTypeGroups.map((g) => ({
          type: g.type,
          count: g._count.id,
        })),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching admin metrics:', error);
    return res.status(500).json({ error: 'Failed to fetch platform metrics' });
  }
};
