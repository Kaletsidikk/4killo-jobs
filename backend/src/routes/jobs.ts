import { Router } from 'express';
import { optionalAuth } from '../middleware/auth';
import { getJobs, getJobById } from '../controllers/jobs.controller';

const router = Router();

// GET /api/jobs      — List jobs with filters & pagination (public, optional auth for isSaved)
router.get('/', optionalAuth, getJobs);

// GET /api/jobs/:id  — Get a single job's full details (public, optional auth for isSaved)
router.get('/:id', optionalAuth, getJobById);

export default router;
