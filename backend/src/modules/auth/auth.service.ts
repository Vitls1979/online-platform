import { Injectable, UnauthorizedException, BadRequestException, Inject } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { SessionService } from './session.service';
import { UserService } from '../user/user.service';
import { User } from '../user/user.entity';
import { TelegramAuthPayload, TelegramAuthService } from './telegram-auth.service';
import { TotpService } from './totp.service';
import { EmailService } from './email.service';
import { KycStatus } from '../user/user-kyc.entity';

export interface RegisterDto {
  email: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
  totpCode?: string;
}

export interface AuthResult {
  user: Omit<User, 'passwordHash' | 'totpSecret'>;
  sessionToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(SessionService) private readonly sessionService: SessionService,
    @Inject(UserService) private readonly userService: UserService,
    @Inject(TelegramAuthService) private readonly telegramAuth: TelegramAuthService,
    @Inject(TotpService) private readonly totpService: TotpService,
    @Inject(EmailService) private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.userService.createUser({
      email: dto.email,
      passwordHash,
    });
    const sessionToken = await this.sessionService.createSession(user.id);
    const sanitized = await this.userService.findById(user.id);
    return {
      user: this.userService.sanitizeUser(sanitized!),
      sessionToken,
    };
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.userService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.twoFactorEnabled) {
      if (!user.totpSecret) {
        throw new BadRequestException('Two-factor secret missing');
      }
      if (!dto.totpCode) {
        throw new UnauthorizedException('Two-factor authentication required');
      }
      const isValidTotp = this.totpService.verifyToken(user.totpSecret, dto.totpCode);
      if (!isValidTotp) {
        throw new UnauthorizedException('Invalid two-factor code');
      }
    }

    const sessionToken = await this.sessionService.createSession(user.id);
    return {
      user: this.userService.sanitizeUser(user),
      sessionToken,
    };
  }

  async generateTwoFactorSecret(userId: string) {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { secret, otpauthUrl } = this.totpService.generateSecret(user.email);
    await this.userService.setTwoFactorSecret(user.id, secret);

    const oneTimeCode = this.totpService.generateToken(secret);
    await this.emailService.sendTwoFactorCode(user.email, oneTimeCode);

    return { secret, otpauthUrl };
  }

  async verifyTwoFactorCode(userId: string, token: string) {
    const user = await this.userService.findById(userId);
    if (!user || !user.totpSecret) {
      throw new UnauthorizedException('Two-factor setup incomplete');
    }

    if (!this.totpService.verifyToken(user.totpSecret, token)) {
      throw new UnauthorizedException('Invalid two-factor code');
    }

    await this.userService.enableTwoFactor(user.id);
    return this.userService.sanitizeUser((await this.userService.findById(user.id))!);
  }

  async completeTelegramAuth(userId: string, payload: TelegramAuthPayload) {
    const result = this.telegramAuth.validatePayload(payload);
    const user = await this.userService.attachTelegramProfile(
      userId,
      result.telegramId,
      result.username,
    );
    return this.userService.sanitizeUser((await this.userService.findById(user.id))!);
  }

  async changeKycStatus(userId: string, status: KycStatus, metadata?: Record<string, any>) {
    const kyc = await this.userService.updateKycStatus(userId, {
      status,
      metadata,
    });
    return kyc;
  }
}
