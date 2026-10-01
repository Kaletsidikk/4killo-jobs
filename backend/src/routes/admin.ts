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
import { authenticateAdmin } from '../middleware/auth';

const router = Router();

// Public route for admin login
router.post('/login', adminLogin);

// Apply admin auth middleware to protect subsequent routes
router.use(authenticateAdmin);

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
