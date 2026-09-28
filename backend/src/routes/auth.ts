import { Router } from 'express';
import { loginWithTelegram } from '../controllers/auth.controller';

const router = Router();

// POST /api/auth/telegram — Authenticate via Telegram Mini-App initData
router.post('/telegram', loginWithTelegram);

export default router;
