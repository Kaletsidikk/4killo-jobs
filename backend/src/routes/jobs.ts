import { Router } from 'express';
import { optionalAuth, authenticateToken } from '../middleware/auth';
import {
  getJobs,
  getJobById,
  getCategories,
  getLocations,
  getSavedJobs,
  saveJob,
  unsaveJob,
} from '../controllers/jobs.controller';

const router = Router();

// GET /api/jobs/categories — Distinct active job categories with counts
router.get('/categories', getCategories);

// GET /api/jobs/locations  — Distinct active job locations with counts
router.get('/locations', getLocations);

// GET /api/jobs/saved      — Get current user's saved jobs (requires auth)
router.get('/saved', authenticateToken, getSavedJobs);

// GET /api/jobs            — List jobs with filters & pagination (public, optional auth for isSaved)
router.get('/', optionalAuth, getJobs);

// GET /api/jobs/:id        — Get single job's full details (public, optional auth for isSaved)
router.get('/:id', optionalAuth, getJobById);

// POST /api/jobs/:id/save   — Bookmark a job (requires auth)
router.post('/:id/save', authenticateToken, saveJob);

// DELETE /api/jobs/:id/save — Remove bookmark for a job (requires auth)
router.delete('/:id/save', authenticateToken, unsaveJob);

export default router;
