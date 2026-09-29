import { Router } from 'express';
import { getSources, addSource } from '../controllers/admin.sources.controller';
import { adminLogin } from '../controllers/admin.auth.controller';
import { authenticateAdmin } from '../middleware/auth';

const router = Router();

// Public route for admin login
router.post('/login', adminLogin);

// Apply admin auth middleware to protect subsequent routes
router.use(authenticateAdmin);

router.get('/sources', getSources);
router.post('/sources', addSource);

export default router;
