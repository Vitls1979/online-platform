import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, createHmac } from 'crypto';
import { TELEGRAM_BOT_TOKEN } from './auth.constants';

export interface TelegramAuthPayload {
  hash: string;
  auth_date: string;
  id: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
  [key: string]: string | undefined;
}

@Injectable()
export class TelegramAuthService {
  constructor(@Inject(TELEGRAM_BOT_TOKEN) private readonly botToken: string) {}

  validatePayload(payload: TelegramAuthPayload) {
    const { hash, ...data } = payload;
    const dataCheckString = Object.keys(data)
      .filter((key) => data[key] !== undefined)
      .sort()
      .map((key) => `${key}=${data[key]}`)
      .join('\n');

    const secretKey = createHash('sha256').update(this.botToken).digest();
    const computedHash = createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (computedHash !== hash) {
      throw new UnauthorizedException('Invalid Telegram payload');
    }

    const authDate = Number(payload.auth_date);
    const now = Math.floor(Date.now() / 1000);
    if (Number.isFinite(authDate) && now - authDate > 86400) {
      throw new UnauthorizedException('Telegram payload expired');
    }

    return {
      telegramId: payload.id,
      username: payload.username ?? null,
    };
  }
}
