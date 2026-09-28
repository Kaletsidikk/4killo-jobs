// Development utility for generating signed Telegram Mini App initData for test.
const crypto = require('crypto');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env in the parent directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const botToken = process.env.TELEGRAM_BOT_TOKEN;

if (!botToken) {
  console.error("Please set a real or dummy TELEGRAM_BOT_TOKEN in your .env file to generate test data.");
}

// 1. Mock user data
const user = {
  id: 123456789,
  first_name: "TestUser",
  last_name: "Dev",
  username: "testuser_dev",
  language_code: "en",
  allows_write_to_pm: true
};

// 2. Build mock query params
const authDate = Math.floor(Date.now() / 1000);
const params = new URLSearchParams({
  user: JSON.stringify(user),
  chat_instance: '1234567890123456789',
  chat_type: 'private',
  auth_date: authDate.toString()
});

// 3. Calculate data_check_string
const keys = Array.from(params.keys()).sort();
const dataCheckString = keys
  .map(key => `${key}=${params.get(key)}`)
  .join('\n');

// 4. Calculate secret_key & hash
const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken || "your_test_bot_token").digest();
const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

// 5. Append hash to get full initData
params.append('hash', hash);

const initData = params.toString();

console.log("\n✅ Generated Valid Signed initData (valid for 24h):\n");
console.log(initData);
console.log("\n👉 Test it with cURL:\n");
console.log(`curl -X POST http://localhost:4000/api/auth/telegram \\
  -H "Content-Type: application/json" \\
  -d '{"initData": "${initData}"}'`);
