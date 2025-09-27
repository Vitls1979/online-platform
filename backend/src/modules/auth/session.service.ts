import { Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { randomUUID } from 'crypto';
import { REDIS_CLIENT, SESSION_TTL_SECONDS } from './auth.constants';

@Injectable()
export class SessionService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(SESSION_TTL_SECONDS) private readonly ttlSeconds: number,
  ) {}

  async createSession(userId: string): Promise<string> {
    const token = randomUUID();
    await this.redis.set(this.key(token), userId, 'EX', this.ttlSeconds);
    return token;
  }

  async getUserIdBySession(token: string): Promise<string | null> {
    return this.redis.get(this.key(token));
  }

  async revokeSession(token: string): Promise<void> {
    await this.redis.del(this.key(token));
  }

  private key(token: string) {
    return `session:${token}`;
  }
}
