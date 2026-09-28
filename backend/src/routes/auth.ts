import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { validateTelegramInitData } from '../utils/telegramAuth';

const router = Router();

// Ensure BigInt (like telegramId) serializes correctly in JSON
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

router.post('/telegram', async (req: Request, res: Response): Promise<any> => {
  try {
    const { initData } = req.body;

    if (!initData) {
      return res.status(400).json({ error: 'Missing initData' });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const jwtSecret = process.env.JWT_SECRET;

    if (!botToken || !jwtSecret) {
      console.error('Missing TELEGRAM_BOT_TOKEN or JWT_SECRET in environment');
      return res.status(500).json({ error: 'Internal server error' });
    }

    const isValid = validateTelegramInitData(initData, botToken);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid or expired initData' });
    }

    // Extract user JSON string from initData
    const urlParams = new URLSearchParams(initData);
    const userStr = urlParams.get('user');
    
    if (!userStr) {
      return res.status(400).json({ error: 'No user data in initData' });
    }

    const telegramUser = JSON.parse(userStr);
    
    // Upsert User in database
    const user = await prisma.user.upsert({
      where: { telegramId: BigInt(telegramUser.id) },
      update: {
        username: telegramUser.username,
        firstName: telegramUser.first_name,
      },
      create: {
        telegramId: BigInt(telegramUser.id),
        username: telegramUser.username,
        firstName: telegramUser.first_name,
      },
    });

    // Create JWT valid for 7 days
    const token = jwt.sign(
      { userId: user.id, telegramId: user.telegramId.toString() },
      jwtSecret,
      { expiresIn: '7d' }
    );

    return res.json({ token, user });
  } catch (error: any) {
    console.error('Auth error:', error);
    return res.status(500).json({ error: 'Authentication failed', details: error.message, stack: error.stack });
  }
});

export default router;
