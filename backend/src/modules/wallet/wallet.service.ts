import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Decimal from 'decimal.js';
import { Wallet } from './wallet.entity';
import { Transaction } from './wallet-transaction.entity';
import {
  PaymentGatewayClient,
  PaymentGatewayError,
} from '../../shared/payment-gateway.client';

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
  amount: string;
  currency: string;
  type: TransactionType;
  metadata?: Record<string, unknown>;
  sourceTransactionId?: string | null;
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
        available: '0.00',
        bonus: '0.00',
        locked: '0.00',
      };
    }

    return {
      available: wallet.availableBalance,
      bonus: wallet.bonusBalance,
      locked: wallet.lockedBalance,
    };
  }

  async createDepositIntent(input: CreateTransactionInput) {
    const { userId, amount, currency } = input;
    const normalizedAmount = new Decimal(amount).toFixed(2);
    this.logger.log(`Creating deposit intent for user ${userId}`);

    let intent: { id: string; redirectUrl: string };
    try {
      intent = await this.paymentGateway.createDepositIntent({
        userId,
        amount: normalizedAmount,
        currency,
        metadata: input.metadata,
      });
    } catch (error) {
      if (error instanceof PaymentGatewayError) {
        this.logger.error(
          `Payment provider rejected deposit intent for user ${userId}: ${error.message}`,
        );
      } else {
        this.logger.error(
          `Unexpected error when creating deposit intent for user ${userId}: ${(error as Error).message}`,
        );
      }
      throw error;
    }

    const transaction = this.transactionRepository.create({
      ...input,
      amount: normalizedAmount,
      status: TransactionStatus.PENDING,
      externalId: intent.id,
      sourceTransactionId: input.sourceTransactionId ?? null,
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
      wallet.availableBalance = new Decimal(wallet.availableBalance)
        .plus(new Decimal(transaction.amount))
        .toFixed(2);
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

  async reserveBetAmount(userId: string, currency: string, amount: string) {
    return this.withTransaction(async (runner) => {
      const wallet = await this.getOrCreateWallet(runner, userId, currency, true);
      const availableBalance = new Decimal(wallet.availableBalance);
      const betAmount = new Decimal(amount);

      if (availableBalance.lessThan(betAmount)) {
        throw new Error('Insufficient funds');
      }

      wallet.availableBalance = availableBalance.minus(betAmount).toFixed(2);
      wallet.lockedBalance = new Decimal(wallet.lockedBalance).plus(betAmount).toFixed(2);
      await runner.manager.save(wallet);

      return wallet;
    });
  }

  async settleBet(userId: string, currency: string, amount: string, winAmount: string) {
    return this.withTransaction(async (runner) => {
      const wallet = await this.getOrCreateWallet(runner, userId, currency, true);
      const betAmount = new Decimal(amount);
      const win = new Decimal(winAmount);
      const normalizedWinAmount = win.toFixed(2);

      wallet.lockedBalance = new Decimal(wallet.lockedBalance).minus(betAmount).toFixed(2);
      wallet.availableBalance = new Decimal(wallet.availableBalance).plus(win).toFixed(2);
      await runner.manager.save(wallet);

      this.eventEmitter.emit('wallet.bet.settled', {
        userId,
        currency,
        winAmount: normalizedWinAmount,
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
        availableBalance: '0.00',
        bonusBalance: '0.00',
        lockedBalance: '0.00',
      });
      await walletRepo.save(wallet);
    }

    return wallet;
  }
}
