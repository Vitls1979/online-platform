import { describe, expect, it, vi } from 'vitest';
import { SessionService, type RedisClient } from '../session.service';

describe('SessionService', () => {
  it('connects to redis before creating a session', async () => {
    const set = vi.fn().mockResolvedValue('OK');
    const redis: RedisClient = {
      status: 'connecting',
      connect: vi.fn().mockImplementation(function (this: RedisClient) {
        this.status = 'ready';
        return Promise.resolve();
      }),
      set: vi.fn().mockImplementation(async function (this: RedisClient, key, value, mode, ttl) {
        return set.call(this, key, value, mode, ttl);
      }),
      get: vi.fn(),
      del: vi.fn(),
    };

    const service = new SessionService(redis, console);

    await service.createSession('user:1', 'token', 60);

    expect(redis.connect).toHaveBeenCalledTimes(1);
    expect(redis.set).toHaveBeenCalledWith('user:1', 'token', 'EX', 60);
    const connectOrder = (redis.connect as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
    const setOrder = (redis.set as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
    expect(connectOrder).toBeLessThan(setOrder);
  });
});
