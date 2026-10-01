import crypto from 'crypto';

export function validateTelegramInitData(initData: string, botToken: string): boolean {
  try {
    const urlParams = new URLSearchParams(initData);
    
    const hash = urlParams.get('hash');
    if (!hash) return false;
    urlParams.delete('hash');

    // Build the data_check_string (sorted alphabetical order)
    const keys = Array.from(urlParams.keys()).sort();
    const dataCheckString = keys
      .map((key) => `${key}=${urlParams.get(key)}`)
      .join('\n');

    // Calculate HMAC
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const expectedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    // Compare hashes safely
    if (crypto.timingSafeEqual(Buffer.from(expectedHash), Buffer.from(hash))) {
      // Check auth_date to prevent replay attacks (older than 24 hours) or future dates
      const authDate = parseInt(urlParams.get('auth_date') || '0', 10);
      
      if (!authDate) return false;

      const now = Math.floor(Date.now() / 1000);
      
      // Reject if older than 24 hours OR more than 5 minutes in the future (clock skew)
      if (now - authDate > 24 * 60 * 60 || authDate > now + 300) {
        return false;
      }
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}
