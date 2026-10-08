/**
 * src/controllers/notifications.controller.ts
 *
 * Webhook endpoint called by the scraper after writing new jobs to the DB.
 *
 * POST /api/notifications/jobs-ingested
 * Body: { jobIds: string[], secret?: string }
 *
 * The scraper should include a shared secret in the body to prevent abuse.
 * Set SCRAPER_WEBHOOK_SECRET in .env on both sides.
 *
 * This controller is intentionally fire-and-forget:
 *  - It immediately returns 202 Accepted to the scraper
 *  - Alert sending happens asynchronously in the background
 */

import { Request, Response } from 'express';
import { sendInstantAlerts } from '../services/alertService';

const WEBHOOK_SECRET = process.env.SCRAPER_WEBHOOK_SECRET;

export const handleJobsIngested = async (req: Request, res: Response): Promise<any> => {
  // Validate shared secret if one is configured
  if (WEBHOOK_SECRET) {
    const incoming = req.headers['x-scraper-secret'] ?? req.body?.secret;
    if (incoming !== WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const { jobIds } = req.body as { jobIds?: string[] };

  if (!Array.isArray(jobIds) || jobIds.length === 0) {
    return res.status(400).json({ error: 'jobIds must be a non-empty array of strings' });
  }

  // Respond immediately so the scraper is not blocked waiting for sends
  res.status(202).json({
    message: 'Accepted. Processing instant alerts in background.',
    jobCount: jobIds.length,
  });

  // Fire-and-forget — errors are caught inside sendInstantAlerts
  sendInstantAlerts(jobIds).catch((err) => {
    console.error('[NotificationsController] Unhandled error in sendInstantAlerts:', err);
  });
};
