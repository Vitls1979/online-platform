import 'reflect-metadata';
import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth.module';
import { AuthService } from '../auth.service';
import { SessionService } from '../session.service';
import { TotpService } from '../totp.service';
import { UserModule } from '../../user/user.module';
import { User } from '../../user/user.entity';
import { UserKyc, KycStatus } from '../../user/user-kyc.entity';
import { REDIS_CLIENT, SESSION_TTL_SECONDS, TELEGRAM_BOT_TOKEN } from '../auth.constants';
import { EmailService } from '../email.service';
import { UserService } from '../../user/user.service';

class InMemoryRedis {
  private readonly store = new Map<string, { value: string; expiresAt: number | null }>();

  async set(key: string, value: string, mode?: string, ttl?: number) {
    let expiresAt: number | null = null;
    if (mode === 'EX' && typeof ttl === 'number') {
      expiresAt = Date.now() + ttl * 1000;
    }
    this.store.set(key, { value, expiresAt });
  }

  async get(key: string) {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async del(key: string) {
    this.store.delete(key);
  }
}

class InMemoryEmailService extends EmailService {
  public readonly sentCodes: Array<{ email: string; code: string }> = [];

  async sendTwoFactorCode(email: string, code: string) {
    this.sentCodes.push({ email, code });
  }
}

describe('AuthModule (integration)', () => {
  let authService: AuthService;
  let sessionService: SessionService;
  let totpService: TotpService;
  let userService: UserService;
  let emailService: InMemoryEmailService;

  beforeAll(async () => {
    const redis = new InMemoryRedis();
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqljs',
          autoSave: false,
          synchronize: true,
          entities: [User, UserKyc],
        }),
        UserModule,
        AuthModule,
      ],
    })
      .overrideProvider(REDIS_CLIENT)
      .useValue(redis as any)
      .overrideProvider(SESSION_TTL_SECONDS)
      .useValue(60 * 60)
      .overrideProvider(TELEGRAM_BOT_TOKEN)
      .useValue('test-telegram-token')
      .overrideProvider(EmailService)
      .useClass(InMemoryEmailService)
      .compile();

    authService = moduleRef.get(AuthService);
    sessionService = moduleRef.get(SessionService);
    totpService = moduleRef.get(TotpService);
    userService = moduleRef.get(UserService);
    emailService = moduleRef.get(EmailService);
  });

  afterAll(async () => {
    // nothing to cleanup
  });

  it('registers a user and stores the session in redis', async () => {
    const result = await authService.register({
      email: 'new-user@example.com',
      password: 'strong-password',
    });

    expect(result.user.email).toBe('new-user@example.com');
    expect(result.sessionToken).toBeDefined();

    const storedUserId = await sessionService.getUserIdBySession(result.sessionToken);
    expect(storedUserId).toBe(result.user.id);

    const user = await userService.findById(result.user.id);
    expect(user?.kyc.status).toBe(KycStatus.PENDING);
  });

  it('enforces two factor auth during login', async () => {
    const registration = await authService.register({
      email: 'twofactor@example.com',
      password: 'password123',
    });

    const { secret } = await authService.generateTwoFactorSecret(registration.user.id);
    const verificationToken = totpService.generateToken(secret);
    await authService.verifyTwoFactorCode(registration.user.id, verificationToken);

    const totpCode = totpService.generateToken(secret);
    const login = await authService.login({
      email: 'twofactor@example.com',
      password: 'password123',
      totpCode,
    });

    expect(login.user.id).toBe(registration.user.id);
    const stored = await sessionService.getUserIdBySession(login.sessionToken);
    expect(stored).toBe(login.user.id);
    expect(emailService.sentCodes.length).toBeGreaterThan(0);
  });

  it('changes KYC status and tracks timestamps', async () => {
    const registration = await authService.register({
      email: 'kyc@example.com',
      password: 'password123',
    });

    const kyc = await authService.changeKycStatus(
      registration.user.id,
      KycStatus.APPROVED,
      { reviewer: 'compliance_officer' },
    );

    expect(kyc.status).toBe(KycStatus.APPROVED);
    expect(kyc.verifiedAt).toBeInstanceOf(Date);
    expect(kyc.metadata).toMatchObject({ reviewer: 'compliance_officer' });
  });
});
