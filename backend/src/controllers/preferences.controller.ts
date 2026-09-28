import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

/**
 * GET /api/preferences
 * Returns the authenticated user's preferences.
 * Auto-creates a default preference record if one doesn't exist yet.
 */
export const getPreferences = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user!.userId;

    // Try to find an existing preference record for this user
    let preference = await prisma.preference.findUnique({
      where: { userId },
    });

    // First-time user: create a default preference record automatically
    if (!preference) {
      preference = await prisma.preference.create({
        data: { userId },
      });
    }

    return res.json(preference);
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return res.status(500).json({ error: 'Failed to fetch preferences' });
  }
};

/**
 * PUT /api/preferences
 * Updates the authenticated user's preferences.
 * Supports partial updates — only the fields provided in the body are changed.
 * Uses upsert to safely handle cases where no preference record exists yet.
 */
export const updatePreferences = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user!.userId;
    const { categories, locations, experienceLevel, instantAlerts, digestAlerts } = req.body;

    const preference = await prisma.preference.upsert({
      where: { userId },
      update: {
        // Only include a field in the update if it was actually sent in the request
        ...(categories !== undefined && { categories }),
        ...(locations !== undefined && { locations }),
        ...(experienceLevel !== undefined && { experienceLevel }),
        ...(instantAlerts !== undefined && { instantAlerts }),
        ...(digestAlerts !== undefined && { digestAlerts }),
      },
      create: {
        userId,
        categories: categories || [],
        locations: locations || [],
        experienceLevel: experienceLevel || 'ENTRY',
        instantAlerts: instantAlerts ?? true,
        digestAlerts: digestAlerts ?? true,
      },
    });

    return res.json(preference);
  } catch (error) {
    console.error('Error updating preferences:', error);
    return res.status(500).json({ error: 'Failed to update preferences' });
  }
};
