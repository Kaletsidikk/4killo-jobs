import { Router } from 'express';
import {
  getSources,
  getSourceById,
  addSource,
  updateSource,
  deleteSource,
  toggleSourceStatus,
  syncSource,
  reloadSources,
} from '../controllers/admin.sources.controller';
import { adminLogin } from '../controllers/admin.auth.controller';
import { getAdminMetrics } from '../controllers/admin.metrics.controller';
import {
  getAdminJobs,
  getAdminJobById,
  toggleJobStatus,
  updateAdminJob,
  deleteAdminJob,
} from '../controllers/admin.jobs.controller';
import {
  getAdminUsers,
  getAdminUserById,
} from '../controllers/admin.users.controller';
import { authenticateAdmin } from '../middleware/auth';

const router = Router();

// Public route for admin login
router.post('/login', adminLogin);

// Apply admin auth middleware to protect subsequent routes
router.use(authenticateAdmin);

// Platform Analytics & Metrics
router.get('/metrics', getAdminMetrics);

// Job Management & Moderation Endpoints
router.get('/jobs', getAdminJobs);
router.get('/jobs/:id', getAdminJobById);
router.patch('/jobs/:id/status', toggleJobStatus);
router.put('/jobs/:id', updateAdminJob);
router.patch('/jobs/:id', updateAdminJob);
router.delete('/jobs/:id', deleteAdminJob);

// User Auditing & Profile Endpoints
router.get('/users', getAdminUsers);
router.get('/users/:id', getAdminUserById);

// Source Management Endpoints
router.get('/sources', getSources);
router.post('/sources/reload', reloadSources);
router.get('/sources/:id', getSourceById);
router.post('/sources', addSource);
router.put('/sources/:id', updateSource);
router.patch('/sources/:id', updateSource);
router.patch('/sources/:id/status', toggleSourceStatus);
router.post('/sources/:id/sync', syncSource);
router.delete('/sources/:id', deleteSource);

export default router;
