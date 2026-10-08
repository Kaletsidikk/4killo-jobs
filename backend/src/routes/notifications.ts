import { Router } from 'express';
import { handleJobsIngested } from '../controllers/notifications.controller';

const router = Router();

/**
 * POST /api/notifications/jobs-ingested
 * Called by the scraper after inserting new jobs.
 * Triggers instant alert matching & push for subscribed users.
 */
router.post('/jobs-ingested', handleJobsIngested);

export default router;
