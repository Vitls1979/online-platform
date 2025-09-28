import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { CreditWalletDto } from './dto/credit-wallet.dto';
import { DebitWalletDto } from './dto/debit-wallet.dto';

@Controller('wallets')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get(':userId/balance')
  getBalance(@Param('userId') userId: string) {
    return this.walletService.getBalance(userId);
  }

  @Post(':userId/credit')
  credit(@Param('userId') userId: string, @Body() dto: CreditWalletDto) {
    return this.walletService.credit({ ...dto, userId });
  }

  @Post(':userId/debit')
  debit(@Param('userId') userId: string, @Body() dto: DebitWalletDto) {
    return this.walletService.debit({ ...dto, userId });
  }
}
