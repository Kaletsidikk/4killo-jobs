import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { Language } from '@prisma/client';

/**
 * Helper to safely serialize BigInt fields (telegramId) in user objects.
 */
function serializeUser(user: any) {
  if (!user) return user;
  return {
    ...user,
    telegramId: user.telegramId !== undefined && user.telegramId !== null
      ? user.telegramId.toString()
      : null,
  };
}

/**
 * GET /api/admin/users
 * Paginated list of registered Telegram users with preferences and bookmark counts.
 */
export const getAdminUsers = async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      page = '1',
      limit = '20',
      search,
      language,
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (language) {
      where.language = language.toUpperCase() as Language;
    }

    if (search && search.trim()) {
      const q = search.trim();
      const isNumeric = /^\d+$/.test(q);

      where.OR = [
        { username: { contains: q, mode: 'insensitive' } },
        { firstName: { contains: q, mode: 'insensitive' } },
        ...(isNumeric ? [{ telegramId: BigInt(q) }] : []),
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          preference: true,
          _count: {
            select: { savedJobs: true },
          },
        },
      }),
    ]);

    return res.json({
      users: users.map(serializeUser),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
};

/**
 * GET /api/admin/users/:id
 * Detailed view of a single user with alert preferences and saved jobs history.
 */
export const getAdminUserById = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params['id'] as string;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        preference: true,
        savedJobs: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            job: {
              select: {
                id: true,
                title: true,
                company: true,
                location: true,
                category: true,
                isActive: true,
                createdAt: true,
              },
            },
          },
        },
        _count: {
          select: { savedJobs: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: serializeUser(user) });
  } catch (error) {
    console.error('Error fetching user details:', error);
    return res.status(500).json({ error: 'Failed to fetch user details' });
  }
};
