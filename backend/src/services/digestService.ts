/**
 * src/services/digestService.ts
 *
 * DAILY DIGEST SERVICE
 * ─────────────────────
 * Runs once per day (scheduled from index.ts).
 * For each user with `digestAlerts: true`, it:
 *   1. Finds all jobs created in the last 24 hours that score ≥ 30 against their prefs
 *   2. Sends a single summary Telegram message listing those matches
 *   3. Stamps `lastDigestSentAt` so double-runs are idempotent
 *
 * Idempotency:
 *   A user whose `lastDigestSentAt` is within the last 20 hours is skipped.
 *   This allows the cron to be called a few times around midnight without spamming users.
 *
 * Design goals:
 *  - Deduplication: never send two digests to the same user in < 20 hours
 *  - Graceful degradation: no bot token → no-op
 *  - Silent per-user failure: one bad send never blocks the rest
 */

import prisma from '../lib/prisma';
import bot, { SendMessageOptions } from '../lib/telegramBot';
import { scoreJob } from '../utils/jobScorer';
import { formatDailyDigest, JobForNotification } from './messageFormatter';

const DIGEST_SCORE_THRESHOLD = 50;   // "Partial Match" or better
const DIGEST_COOLDOWN_HOURS = 20;    // skip users who got a digest in the last 20h
const SEND_DELAY_MS = 100;           // 10 msgs/sec — conservative for a bulk job
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME ?? '4killo_bot';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run the daily digest for ALL subscribed users.
 * Meant to be called by a cron scheduler (e.g., node-cron at 08:00 AM).
 */
export async function runDailyDigest(): Promise<void> {
  if (!bot) {
    console.warn('[DigestService] Bot not configured; skipping daily digest.');
    return;
  }

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const cooldownCutoff = new Date(now.getTime() - DIGEST_COOLDOWN_HOURS * 60 * 60 * 1000);

  console.log('[DigestService] Starting daily digest run...');

  // 1. Fetch all jobs created in the last 24 hours
  const recentJobs = await prisma.job.findMany({
    where: { createdAt: { gte: oneDayAgo }, isActive: true },
    include: {
      sources: {
        select: { postUrl: true, sourceName: true },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (recentJobs.length === 0) {
    console.log('[DigestService] No new jobs in the last 24h. Skipping digest.');
    return;
  }

  console.log(`[DigestService] ${recentJobs.length} recent jobs found. Fetching subscribed users...`);

  // 2. Fetch all users with digestAlerts enabled who haven't received a digest recently
  const users = await prisma.user.findMany({
    where: {
      preference: {
        digestAlerts: true,
        OR: [
          { lastDigestSentAt: null },
          { lastDigestSentAt: { lt: cooldownCutoff } },
        ],
      },
    },
    select: {
      telegramId: true,
      preference: {
        select: {
          id: true,
          categories: true,
          locations: true,
          experienceLevel: true,
        },
      },
    },
  });

  if (users.length === 0) {
    console.log('[DigestService] No users due for a digest. Exiting.');
    return;
  }

  console.log(`[DigestService] Sending digest to up to ${users.length} users.`);

  let totalSent = 0;
  let totalSkipped = 0;
  let totalEmpty = 0;

  for (const user of users) {
    const pref = user.preference!;

    // Score each recent job against this user's preferences
    const matchedJobs: JobForNotification[] = recentJobs
      .map((job) => {
        const { score } = scoreJob(
          {
            category: job.category,
            location: job.location,
            experienceLevel: job.experienceLevel,
            createdAt: job.createdAt,
          },
          {
            categories: pref.categories,
            locations: pref.locations,
            experienceLevel: pref.experienceLevel,
          },
        );
        return { job, score };
      })
      .filter(({ score }) => score >= DIGEST_SCORE_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .map(({ job }) => ({
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        category: job.category,
        deadline: job.deadline,
        sources: job.sources,
      }));

    if (matchedJobs.length === 0) {
      totalEmpty++;
      // Still stamp lastDigestSentAt so we don't retry them again today
      await prisma.preference.update({
        where: { id: pref.id },
        data: { lastDigestSentAt: new Date() },
      });
      continue;
    }

    const message = formatDailyDigest(matchedJobs, BOT_USERNAME);

    const msgOptions: SendMessageOptions = {
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true,
    };

    try {
      await bot.sendMessage(user.telegramId.toString(), message, msgOptions);

      await prisma.preference.update({
        where: { id: pref.id },
        data: { lastDigestSentAt: new Date() },
      });

      totalSent++;
      await sleep(SEND_DELAY_MS);
    } catch (err: any) {
      const errMsg = (err?.message ?? '') as string;
      if (errMsg.includes('403') || errMsg.includes('Forbidden')) {
        console.warn(`[DigestService] User ${user.telegramId} has blocked the bot.`);
      } else {
        console.error(`[DigestService] Failed to send to ${user.telegramId}:`, errMsg);
      }
      totalSkipped++;
    }
  }

  console.log(
    `[DigestService] Digest complete. Sent: ${totalSent}, No matches: ${totalEmpty}, Errors: ${totalSkipped}`,
  );
}
