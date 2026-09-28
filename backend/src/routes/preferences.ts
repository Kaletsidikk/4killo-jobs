import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { getPreferences, updatePreferences } from '../controllers/preferences.controller';

const router = Router();

// GET  /api/preferences — Fetch current user's preferences
router.get('/', authenticateToken, getPreferences);

// PUT  /api/preferences — Update current user's preferences
router.put('/', authenticateToken, updatePreferences);

export default router;
