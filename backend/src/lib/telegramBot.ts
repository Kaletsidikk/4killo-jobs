/**
 * src/lib/telegramBot.ts
 *
 * Thin wrapper around node-telegram-bot-api that avoids TypeScript
 * namespace conflicts between the package's own types and @types.
 *
 * Only exposes sendMessage — the only method the push service needs.
 * polling: false — this process only sends, never receives updates.
 */

// @ts-ignore
import TelegramBot from 'node-telegram-bot-api';

export interface SendMessageOptions {
  parse_mode?: 'MarkdownV2' | 'HTML' | 'Markdown';
  disable_web_page_preview?: boolean;
}

export interface TelegramBotClient {
  sendMessage(chatId: string, text: string, options?: SendMessageOptions): Promise<void>;
}

function createBot(token: string): TelegramBotClient {
  // @ts-ignore
  const instance = new TelegramBot(token, { polling: false });
  return {
    sendMessage: async (chatId, text, options) => {
      await instance.sendMessage(chatId, text, options);
    },
  };
}
const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.warn('[TelegramBot] TELEGRAM_BOT_TOKEN is not set. Push notifications will be disabled.');
}

const bot: TelegramBotClient | null = token ? createBot(token) : null;

export default bot;

