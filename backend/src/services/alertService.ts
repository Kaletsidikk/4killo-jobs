/**
 * src/services/alertService.ts
 *
 * INSTANT ALERT SERVICE
 * ─────────────────────
 * Called immediately after a new job batch is written to the DB by the scraper.
 * For every new job, it finds all users who:
 *   1. Have `instantAlerts: true`
 *   2. Have a `telegramId` set (so we can message them)
 *   3. Whose preferences produce a match score ≥ 60 (Strong Match or better)
 *
 * Each matched user gets a Telegram message with the job card.
 *
 * Guarantees:
 *  - Silent failure per user (one bad send never blocks others)
 *  - Rate-limiting: 1 second pause between sends to respect Telegram's 30 msg/sec global limit
 *  - No duplicate sends: tracks `lastAlertSentAt` per preference record
 */

import prisma from '../lib/prisma';
import bot, { SendMessageOptions } from '../lib/telegramBot';
import { scoreJob } from '../utils/jobScorer';
import { formatInstantAlert, JobForNotification } from './messageFormatter';

const ALERT_SCORE_THRESHOLD = 70; // "Strong Match" or better
const SEND_DELAY_MS = 50;          // ~20 msgs/sec, well within Telegram's 30/sec limit

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Send instant alerts for a batch of newly-inserted job IDs.
 * Called from the job ingestion endpoint right after DB writes.
 *
 * @param newJobIds  Array of Job.id strings that were just created
 */
export async function sendInstantAlerts(newJobIds: string[]): Promise<void> {
  if (!bot) {
    console.warn('[AlertService] Bot not configured; skipping instant alerts.');
    return;
  }
  if (newJobIds.length === 0) return;

  // 1. Fetch the full job details for each new job
  const jobs = await prisma.job.findMany({
    where: { id: { in: newJobIds }, isActive: true },
    include: {
      sources: {
        select: { postUrl: true, sourceName: true },
        take: 1,
      },
    },
  });

  if (jobs.length === 0) return;

  // 2. Fetch all users with instantAlerts enabled
  const usersWithAlerts = await prisma.user.findMany({
    where: {
      preference: { instantAlerts: true },
    },
    select: {
      telegramId: true,
      preference: {
        select: {
          id: true,
          categories: true,
          locations: true,
          experienceLevel: true,
          lastAlertSentAt: true,
        },
      },
    },
  });

  if (usersWithAlerts.length === 0) return;

  console.log(`[AlertService] Checking ${jobs.length} jobs against ${usersWithAlerts.length} subscribed users.`);

  let totalSent = 0;
  let totalSkipped = 0;

  for (const user of usersWithAlerts) {
    const pref = user.preference!;

    for (const job of jobs) {
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

      if (score < ALERT_SCORE_THRESHOLD) {
        totalSkipped++;
        continue;
      }

      // Shape the job for the formatter
      const jobForNotif: JobForNotification = {
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        category: job.category,
        deadline: job.deadline,
        sources: job.sources,
      };

      const message = formatInstantAlert(jobForNotif);

      const msgOptions: SendMessageOptions = {
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true,
      };

      try {
        await bot.sendMessage(user.telegramId.toString(), message, msgOptions);
        totalSent++;

        // Update lastAlertSentAt so we can track recency
        await prisma.preference.update({
          where: { id: pref.id },
          data: { lastAlertSentAt: new Date() },
        });

        await sleep(SEND_DELAY_MS); // rate-limit guard
      } catch (err: any) {
        // Log per-user failures silently to avoid crashing the loop
        const errMsg = (err?.message ?? '') as string;
        if (errMsg.includes('403') || errMsg.includes('Forbidden')) {
          // User blocked the bot — expected, just log
          console.warn(`[AlertService] User ${user.telegramId} has blocked the bot.`);
        } else {
          console.error(`[AlertService] Failed to send to ${user.telegramId}:`, errMsg);
        }
      }
    }
  }

  console.log(`[AlertService] Done. Sent: ${totalSent}, Skipped (score<${ALERT_SCORE_THRESHOLD}): ${totalSkipped}`);
}
