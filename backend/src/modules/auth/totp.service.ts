import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';

export interface TotpSecret {
  secret: string;
  otpauthUrl: string;
}

@Injectable()
export class TotpService {
  generateSecret(email: string): TotpSecret {
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(email, 'OnlinePlatform', secret);
    return { secret, otpauthUrl };
  }

  generateToken(secret: string): string {
    return authenticator.generate(secret);
  }

  verifyToken(secret: string, token: string): boolean {
    return authenticator.verify({ secret, token });
  }
}
