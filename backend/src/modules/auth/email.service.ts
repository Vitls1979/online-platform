import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendTwoFactorCode(email: string, code: string) {
    this.logger.log(`Sending 2FA code to ${email}: ${code}`);
  }
}
