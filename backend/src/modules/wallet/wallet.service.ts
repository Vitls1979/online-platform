import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Wallet } from './wallet.entity';
import { Transaction } from './wallet-transaction.entity';
import { PaymentGatewayClient } from '../../shared/payment-gateway.client';

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  BET = 'bet',
  WIN = 'win',
  BONUS = 'bonus',
}

export enum TransactionStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
}

export interface CreateTransactionInput {
  userId: string;
  amount: number;
  currency: string;
  type: TransactionType;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly dataSource: DataSource,
    private readonly paymentGateway: PaymentGatewayClient,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getBalance(userId: string, currency: string) {
    const wallet = await this.walletRepository.findOne({
      where: { userId, currency },
    });

    if (!wallet) {
      return {
        available: 0,
        bonus: 0,
        locked: 0,
      };
    }

    return {
      available: Number(wallet.availableBalance),
      bonus: Number(wallet.bonusBalance),
      locked: Number(wallet.lockedBalance),
    };
  }

  async createDepositIntent(input: CreateTransactionInput) {
    const { userId, amount, currency } = input;
    this.logger.log(`Creating deposit intent for user ${userId}`);

    const intent = await this.paymentGateway.createDepositIntent({
      userId,
      amount,
      currency,
      metadata: input.metadata,
    });

    const transaction = this.transactionRepository.create({
      ...input,
      status: TransactionStatus.PENDING,
      externalId: intent.id,
    });

    await this.transactionRepository.save(transaction);

    return { intentId: intent.id, redirectUrl: intent.redirectUrl };
  }

  async handlePaymentWebhook(payload: any) {
    const { externalId, status } = payload;
    const transaction = await this.transactionRepository.findOne({
      where: { externalId },
    });

    if (!transaction) {
      this.logger.warn(`Transaction with externalId ${externalId} not found`);
      return;
    }

    if (transaction.status !== TransactionStatus.PENDING) {
      this.logger.log(`Skipping transaction ${transaction.id} in status ${transaction.status}`);
      return;
    }

    if (status === 'succeeded') {
      await this.markTransactionSuccess(transaction.id);
    } else if (status === 'failed') {
      await this.markTransactionFailed(transaction.id, payload.failureReason);
    }
  }

  async markTransactionSuccess(transactionId: string) {
    await this.withTransaction(async (runner) => {
      const transaction = await runner.manager.findOne(Transaction, {
        where: { id: transactionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!transaction) {
        throw new Error(`Transaction ${transactionId} not found`);
      }

      if (transaction.status !== TransactionStatus.PENDING) {
        this.logger.log(`Transaction ${transaction.id} already processed`);
        return transaction;
      }

      transaction.status = TransactionStatus.SUCCESS;
      await runner.manager.save(transaction);

      const wallet = await this.getOrCreateWallet(runner, transaction.userId, transaction.currency);
      wallet.availableBalance = Number(wallet.availableBalance) + Number(transaction.amount);
      await runner.manager.save(wallet);

      await runner.manager.insert('wallet_balance_log', {
        walletId: wallet.id,
        transactionId: transaction.id,
        balanceAfter: wallet.availableBalance,
        createdAt: new Date(),
      });

      this.eventEmitter.emit('wallet.balance.updated', {
        userId: wallet.userId,
        currency: wallet.currency,
        balance: wallet.availableBalance,
      });

      return transaction;
    });
  }

  async markTransactionFailed(transactionId: string, reason?: string) {
    const transaction = await this.transactionRepository.findOne({ where: { id: transactionId } });
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    if (transaction.status !== TransactionStatus.PENDING) {
      this.logger.log(`Transaction ${transaction.id} already processed`);
      return transaction;
    }

    transaction.status = TransactionStatus.FAILED;
    transaction.failureReason = reason;
    await this.transactionRepository.save(transaction);

    this.eventEmitter.emit('wallet.transaction.failed', {
      transactionId,
      userId: transaction.userId,
      reason,
    });

    return transaction;
  }

  async reserveBetAmount(userId: string, currency: string, amount: number) {
    return this.withTransaction(async (runner) => {
      const wallet = await this.getOrCreateWallet(runner, userId, currency, true);
      if (wallet.availableBalance < amount) {
        throw new Error('Insufficient funds');
      }

      wallet.availableBalance -= amount;
      wallet.lockedBalance += amount;
      await runner.manager.save(wallet);

      return wallet;
    });
  }

  async settleBet(userId: string, currency: string, amount: number, winAmount: number) {
    return this.withTransaction(async (runner) => {
      const wallet = await this.getOrCreateWallet(runner, userId, currency, true);
      wallet.lockedBalance -= amount;
      wallet.availableBalance += winAmount;
      await runner.manager.save(wallet);

      this.eventEmitter.emit('wallet.bet.settled', {
        userId,
        currency,
        winAmount,
      });

      return wallet;
    });
  }

  private async withTransaction<T>(handler: (runner: QueryRunner) => Promise<T>): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await handler(queryRunner);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Transaction rolled back', error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async getOrCreateWallet(
    runner: QueryRunner,
    userId: string,
    currency: string,
    forUpdate = false,
  ): Promise<Wallet> {
    const walletRepo = runner.manager.getRepository(Wallet);
    let wallet = await walletRepo.findOne({
      where: { userId, currency },
      lock: forUpdate ? { mode: 'pessimistic_write' } : undefined,
    });

    if (!wallet) {
      wallet = walletRepo.create({
        userId,
        currency,
        availableBalance: 0,
        bonusBalance: 0,
        lockedBalance: 0,
      });
      await walletRepo.save(wallet);
    }

    return wallet;
  }
}
