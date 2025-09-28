import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Decimal from 'decimal.js-light';
import { DataSource, Repository } from 'typeorm';
import { WalletAccount } from './wallet-account.entity';
import { WalletTransaction } from './wallet-transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { WalletEventPublisher } from './wallet-event.publisher';

export type TransactionContext = {
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
  performedBy: string;
};

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(WalletAccount)
    private readonly accountRepository: Repository<WalletAccount>,
    private readonly dataSource: DataSource,
    private readonly events: WalletEventPublisher,
  ) {}

  async getBalance(userId: string, currency: string): Promise<Record<string, string>> {
    const accounts = await this.accountRepository.find({
      where: { userId, currency },
    });

    return accounts.reduce<Record<string, string>>((acc, account) => {
      acc[account.type] = account.balance.toFixed(2);
      return acc;
    }, {});
  }

  async createTransaction(
    dto: CreateTransactionDto,
    context: TransactionContext,
  ): Promise<WalletTransaction> {
    const delta = new Decimal(dto.amountDelta);

    return this.dataSource.transaction(async (manager) => {
      const account = await manager.findOne(WalletAccount, {
        where: {
          userId: dto.userId,
          currency: dto.currency,
          type: dto.accountType,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!account) {
        throw new Error('Wallet account not found');
      }

      const existing = await manager.findOne(WalletTransaction, {
        where: { idempotencyKey: context.idempotencyKey },
      });

      if (existing) {
        this.logger.debug(`Idempotent transaction: ${context.idempotencyKey}`);
        return existing;
      }

      const balanceAfter = account.balance.plus(delta);
      if (balanceAfter.isNegative()) {
        throw new Error('Insufficient funds');
      }

      account.balance = balanceAfter;
      await manager.save(account);

      const transaction = manager.create(WalletTransaction, {
        userId: dto.userId,
        walletAccountId: account.id,
        accountType: dto.accountType,
        amount: delta,
        type: dto.type,
        status: 'success',
        currency: dto.currency,
        metadata: { ...dto.metadata, ...context.metadata },
        idempotencyKey: context.idempotencyKey,
        performedBy: context.performedBy,
      });

      await manager.save(transaction);

      await this.events.publishTransactionCompleted({
        transactionId: transaction.id,
        userId: dto.userId,
        accountType: dto.accountType,
        amount: delta.toFixed(2),
        currency: dto.currency,
        metadata: transaction.metadata,
      });

      return transaction;
    });
  }
}
