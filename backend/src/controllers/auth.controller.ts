import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { validateTelegramInitData } from '../utils/telegramAuth';

// Ensure BigInt (like telegramId) serializes correctly in JSON responses
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

/**
 * POST /api/auth/telegram
 * Authenticates a Telegram Mini-App user via cryptographically signed initData.
 * Creates the user in DB if they don't exist, or updates their info if they do.
 * Returns a signed JWT token valid for 7 days.
 */
export const loginWithTelegram = async (req: Request, res: Response): Promise<any> => {
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

    // Step 1: Validate the HMAC signature from Telegram
    const isValid = validateTelegramInitData(initData, botToken);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid or expired initData' });
    }

    // Step 2: Extract the user object from initData
    const urlParams = new URLSearchParams(initData);
    const userStr = urlParams.get('user');
    if (!userStr) {
      return res.status(400).json({ error: 'No user data in initData' });
    }

    const telegramUser = JSON.parse(userStr);

    // Step 3: Upsert the user — create if new, update name/username if returning
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

    // Step 4: Sign and return a JWT token
    const token = jwt.sign(
      { userId: user.id, telegramId: user.telegramId.toString() },
      jwtSecret,
      { expiresIn: '7d' }
    );

    return res.json({ token, user });
  } catch (error: any) {
    console.error('Auth error:', error);
    return res.status(500).json({ error: 'Authentication failed', details: error.message });
  }
};
