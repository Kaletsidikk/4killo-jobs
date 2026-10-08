/**
 * src/services/messageFormatter.ts
 *
 * Formats Telegram messages for instant alerts and daily digests.
 * Uses Telegram's MarkdownV2 format for rich text.
 *
 * MarkdownV2 requires escaping: _ * [ ] ( ) ~ ` > # + - = | { } . !
 */

/** Fields required to format a job notification card */
export interface JobForNotification {
  id: string;
  title: string;
  company: string;
  location: string;
  category: string;
  deadline?: Date | null;
  sources: Array<{ postUrl: string; sourceName: string }>;
}

/** Escape special MarkdownV2 characters */
function esc(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, (c) => `\\${c}`);
}

function formatDeadline(deadline: Date | null | undefined): string {
  if (!deadline) return 'Open';
  return new Date(deadline).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Single-job instant alert card.
 *
 * Example output:
 * 🆕 *New Job Match*
 * 💼 *Senior Accountant*
 * 🏢 Private Client
 * 📍 Addis Ababa
 * 🗂 Banking & Finance
 * ⏰ Deadline: Oct 16, 2026
 * 🔗 [View Job](https://t.me/...)
 */
export function formatInstantAlert(job: JobForNotification): string {
  const postUrl = job.sources[0]?.postUrl ?? '';
  const deadline = formatDeadline(job.deadline);

  return (
    `🆕 *New Job Match\\!*\n\n` +
    `💼 *${esc(job.title)}*\n` +
    `🏢 ${esc(job.company)}\n` +
    `📍 ${esc(job.location)}\n` +
    `🗂 ${esc(job.category)}\n` +
    `⏰ Deadline: ${esc(deadline)}\n\n` +
    (postUrl ? `🔗 [View Job](${postUrl})` : '')
  );
}

/**
 * Daily digest message for multiple jobs.
 *
 * Example:
 * 📋 *Your Daily Job Digest*
 * _3 new matches since yesterday_
 *
 * 1️⃣ *Senior Accountant* · Private Client · Addis Ababa
 *    [View →](https://t.me/...)
 *
 * 2️⃣ ...
 *
 * 👉 [Open 4killo Jobs](https://t.me/your_bot)
 */
export function formatDailyDigest(jobs: JobForNotification[], botUsername: string): string {
  const count = jobs.length;
  const emoji = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

  const header =
    `📋 *Your Daily Job Digest*\n` +
    `_${esc(`${count} new match${count !== 1 ? 'es' : ''} since yesterday`)}_\n\n`;

  const jobLines = jobs
    .slice(0, 10) // cap at 10 to stay within Telegram message limit
    .map((job, i) => {
      const postUrl = job.sources[0]?.postUrl ?? '';
      const num = emoji[i] ?? `${i + 1}\\.`;
      const line =
        `${num} *${esc(job.title)}* · ${esc(job.company)} · ${esc(job.location)}\n` +
        (postUrl ? `   [View →](${postUrl})\n` : '');
      return line;
    })
    .join('\n');

  const footer = `\n👉 [Open 4killo Jobs](https://t.me/${botUsername})`;

  return header + jobLines + footer;
}
