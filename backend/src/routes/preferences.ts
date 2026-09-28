import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

// GET /api/preferences
// Fetches the current user's preferences. Creates default ones if they don't exist.
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user!.userId;
    
    // Attempt to find existing preferences for the user
    let preference = await prisma.preference.findUnique({
      where: { userId }
    });

    // If they have never set preferences before, initialize with default values
    if (!preference) {
      preference = await prisma.preference.create({
        data: { userId }
      });
    }

    return res.json(preference);
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// PUT /api/preferences
// Updates the current user's preferences.
router.put('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user!.userId;
    
    // Extract preference fields from the request body
    const { categories, locations, experienceLevel, instantAlerts, digestAlerts } = req.body;

    // We use "upsert" so that if the preference record doesn't exist yet, it gets created.
    // If it does exist, it simply updates the provided fields.
    const preference = await prisma.preference.upsert({
      where: { userId },
      update: {
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
      }
    });

    return res.json(preference);
  } catch (error) {
    console.error('Error updating preferences:', error);
    return res.status(500).json({ error: 'Failed to update preferences' });
  }
});

export default router;
