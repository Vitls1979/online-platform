import { Injectable } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { v4 as uuid } from 'uuid';
import { WalletLedger } from './wallet.ledger';
import { BalanceSnapshot, TransactionKind } from './wallet.types';
import { CreditWalletDto } from './dto/credit-wallet.dto';
import { DebitWalletDto } from './dto/debit-wallet.dto';
import { WalletTransactionCreatedEvent } from './events/wallet-transaction-created.event';

@Injectable()
export class WalletService {
  constructor(
    private readonly ledger: WalletLedger,
    private readonly eventBus: EventBus,
  ) {}

  async getBalance(userId: string): Promise<BalanceSnapshot> {
    return this.ledger.fetchBalance(userId);
  }

  async credit(dto: CreditWalletDto): Promise<BalanceSnapshot> {
    const transactionId = uuid();
    const balance = await this.ledger.applyCredit({
      transactionId,
      userId: dto.userId,
      amount: dto.amount,
      currency: dto.currency,
      reason: dto.reason,
      metadata: dto.metadata,
    });

    this.eventBus.publish(
      new WalletTransactionCreatedEvent({
        transactionId,
        userId: dto.userId,
        amount: dto.amount,
        currency: dto.currency,
        kind: TransactionKind.Credit,
        source: dto.source,
        metadata: dto.metadata,
      }),
    );

    return balance;
  }

  async debit(dto: DebitWalletDto): Promise<BalanceSnapshot> {
    const transactionId = uuid();
    const balance = await this.ledger.applyDebit({
      transactionId,
      userId: dto.userId,
      amount: dto.amount,
      currency: dto.currency,
      reason: dto.reason,
      metadata: dto.metadata,
      lockFunds: dto.lockFunds ?? false,
    });

    this.eventBus.publish(
      new WalletTransactionCreatedEvent({
        transactionId,
        userId: dto.userId,
        amount: dto.amount,
        currency: dto.currency,
        kind: TransactionKind.Debit,
        source: dto.source,
        metadata: dto.metadata,
      }),
    );

    return balance;
  }
}
