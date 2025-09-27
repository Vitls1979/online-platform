import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { WalletLedger } from './wallet.ledger';

@Module({
  imports: [CqrsModule],
  controllers: [WalletController],
  providers: [WalletService, WalletLedger],
  exports: [WalletService],
})
export class WalletModule {}
