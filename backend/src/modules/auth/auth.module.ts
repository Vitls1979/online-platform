export interface RedisLike {
  status?: string;
  connect?: () => Promise<void> | void;
}

export interface RedisFactory<T extends RedisLike> {
  (): T;
}

export type LoggerLike = Pick<Console, 'error' | 'log'>;

export async function initializeRedisClient<T extends RedisLike>(
  factory: RedisFactory<T>,
  logger: LoggerLike = console,
): Promise<T> {
  const client = factory();

  if (typeof client.connect === 'function') {
    try {
      await client.connect();
      logger.log?.('Redis connection established');
    } catch (error) {
      logger.error?.('Failed to connect to Redis', error);
      throw error;
    }
  }

  return client;
}
