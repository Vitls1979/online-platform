import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import { AuthService, LoginDto, RegisterDto } from './auth.service';
import { TelegramAuthPayload } from './telegram-auth.service';
import { KycStatus } from '../user/user-kyc.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('telegram/:userId')
  completeTelegramAuth(
    @Param('userId') userId: string,
    @Body() payload: TelegramAuthPayload,
  ) {
    return this.authService.completeTelegramAuth(userId, payload);
  }

  @Post('2fa/:userId/setup')
  setupTwoFactor(@Param('userId') userId: string) {
    return this.authService.generateTwoFactorSecret(userId);
  }

  @Post('2fa/:userId/verify')
  verifyTwoFactor(@Param('userId') userId: string, @Body('token') token: string) {
    return this.authService.verifyTwoFactorCode(userId, token);
  }

  @Patch('kyc/:userId')
  updateKyc(
    @Param('userId') userId: string,
    @Body('status') status: KycStatus,
    @Body('metadata') metadata?: Record<string, any>,
  ) {
    return this.authService.changeKycStatus(userId, status, metadata);
  }
}
