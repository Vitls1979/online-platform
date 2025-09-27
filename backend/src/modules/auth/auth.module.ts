import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { TotpService } from './totp.service';
import { TelegramAuthService } from './telegram-auth.service';
import { UserModule } from '../user/user.module';
import { User } from '../user/user.entity';
import { UserKyc } from '../user/user-kyc.entity';
import { REDIS_CLIENT, SESSION_TTL_SECONDS, TELEGRAM_BOT_TOKEN } from './auth.constants';
import { EmailService } from './email.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserKyc]), UserModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionService,
    TotpService,
    TelegramAuthService,
    EmailService,
    {
      provide: REDIS_CLIENT,
      useFactory: () =>
        new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
          lazyConnect: true,
        }),
    },
    {
      provide: SESSION_TTL_SECONDS,
      useValue: 60 * 60 * 24,
    },
    {
      provide: TELEGRAM_BOT_TOKEN,
      useFactory: () => process.env.TELEGRAM_BOT_TOKEN ?? 'telegram-test-token',
    },
  ],
  exports: [AuthService, SessionService, TotpService],
})
export class AuthModule {}
