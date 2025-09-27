import type { RedisLike } from './auth.module';

export interface OnModuleInit {
  onModuleInit(): unknown;
}

export interface RedisCommands {
  set: (key: string, value: string, mode: 'EX', ttlSeconds: number) => Promise<unknown> | unknown;
  get: (key: string) => Promise<string | null> | string | null;
  del: (key: string) => Promise<unknown> | unknown;
}

export type RedisClient = RedisLike & RedisCommands;

export class SessionService implements OnModuleInit {
  private connecting?: Promise<void>;

  constructor(private readonly redis: RedisClient, private readonly logger: Console = console) {}

  async onModuleInit() {
    try {
      await this.ensureConnected();
    } catch (error) {
      this.logger.error?.('Failed to initialize Redis connection for SessionService', error);
    }
  }

  async createSession(key: string, value: string, ttlSeconds: number) {
    await this.ensureConnected();
    return this.redis.set(key, value, 'EX', ttlSeconds);
  }

  async getSession(key: string) {
    await this.ensureConnected();
    return this.redis.get(key);
  }

  async deleteSession(key: string) {
    await this.ensureConnected();
    return this.redis.del(key);
  }

  private async ensureConnected() {
    if (this.redis.status === 'ready') {
      return;
    }

    if (!this.connecting) {
      const connectFn = this.redis.connect?.bind(this.redis);
      if (!connectFn) {
        return;
      }

      this.connecting = Promise.resolve()
        .then(() => connectFn())
        .catch((error) => {
          this.logger.error?.('Redis connection failed', error);
          throw error;
        })
        .finally(() => {
          this.connecting = undefined;
        });
    }

    await this.connecting;
  }
}
