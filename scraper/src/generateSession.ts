import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const apiId = parseInt(process.env.TELEGRAM_API_ID || '', 10);
const apiHash = process.env.TELEGRAM_API_HASH || '';

if (!apiId || !apiHash) {
  console.error('\n ERROR: Missing TELEGRAM_API_ID or TELEGRAM_API_HASH in .env file!');
  console.log('Please create scraper/.env with:');
  console.log('TELEGRAM_API_ID=your_id');
  console.log('TELEGRAM_API_HASH=your_hash\n');
  process.exit(1);
}

const stringSession = new StringSession('');
const rl = readline.createInterface({ input, output });

(async () => {
  console.log('\n========================================');
  console.log(' 4KILLO Telegram Session Generator');
  console.log('========================================');
  console.log('Connecting to Telegram MTProto servers...\n');

  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => await rl.question('Enter your phone number (with country code): '),
    password: async () => await rl.question('Enter your 2FA password (leave empty if none): '),
    phoneCode: async () => await rl.question('Enter the OTP code Telegram sent you: '),
    onError: (err) => console.error('Authentication Error:', err),
  });

  console.log('\n Successfully authenticated with Telegram!');
  const sessionToken = client.session.save() as unknown as string;

  console.log('\n======================================================');
  console.log('YOUR PERSISTENT SESSION STRING IS READY:');
  console.log('======================================================\n');
  console.log(sessionToken);
  console.log('\n======================================================');
  console.log('Copy the token above and add it to your .env file:');
  console.log('TELEGRAM_STRING_SESSION=' + sessionToken);
  console.log('======================================================\n');

  // Automatically append or update in .env if exists
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf8');
    if (envContent.includes('TELEGRAM_STRING_SESSION=')) {
      envContent = envContent.replace(/TELEGRAM_STRING_SESSION=.*/, `TELEGRAM_STRING_SESSION=${sessionToken}`);
    } else {
      envContent += `\nTELEGRAM_STRING_SESSION=${sessionToken}\n`;
    }
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log('Automatically updated TELEGRAM_STRING_SESSION in .env!\n');
  }

  rl.close();
  await client.disconnect();
  process.exit(0);
})();
