import { Router, Request, Response } from 'express';
import {
  VOXIDE_CAPABILITY_MANIFEST,
  VOXIDE_SYSTEM_PROMPT,
  parseEthiopianVoiceIntent,
} from '../shared/voxide';
import { optionalAuth } from '../middleware/auth';
import { voiceSearch, voiceSearchGet } from '../controllers/voice.controller';

const router = Router();

/**
 * GET /api/voice/voxide-capability
 * Returns the Voxide Voice AI capability manifest and system configuration rules.
 */
router.get('/voxide-capability', (_req: Request, res: Response) => {
  return res.json({
    ...VOXIDE_CAPABILITY_MANIFEST,
    systemPrompt: VOXIDE_SYSTEM_PROMPT,
  });
});

/**
 * POST /api/voice/parse-intent
 * Receives spoken text transcript and normalizes it into search parameters.
 */
router.post('/parse-intent', (req: Request, res: Response) => {
  const transcript = req.body?.transcript ?? req.body?.text ?? req.body?.query;

  if (typeof transcript !== 'string') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Field "transcript" must be provided as a string in the request body.',
    });
  }

  const params = parseEthiopianVoiceIntent(transcript);

  return res.json({
    status: 'success',
    transcript,
    intent: 'searchJobs',
    params,
    ...params,
  });
});

// ── POST /api/voice/search ────────────────────────────────────────────────────
// Full voice-to-results pipeline: transcript → NLU → Prisma WHERE → DB → jobs.
// Optional auth: includes isSaved flag when a valid JWT is present.
router.post('/search', optionalAuth, voiceSearch);

// ── GET /api/voice/search ─────────────────────────────────────────────────────
// Voxide deep-link variant: ?q=<transcript>&page=1&limit=10
router.get('/search', optionalAuth, voiceSearchGet);

export default router;
