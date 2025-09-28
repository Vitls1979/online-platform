import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DataSource, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Mocked } from 'vitest';
import {
  WalletService,
  TransactionType,
  TransactionStatus,
} from './wallet.service';
import { Wallet } from './wallet.entity';
import { Transaction } from './wallet-transaction.entity';
import { WalletBalanceLog } from './wallet-balance-log.entity';
import { PaymentGatewayClient } from '../../shared/payment-gateway.client';

vi.mock('typeorm', () => ({
  Repository: class Repository {},
  DataSource: class DataSource {
    createQueryRunner() {
      return {};
    }
  },
  QueryRunner: class QueryRunner {},
  Entity: () => () => undefined,
  Column: () => () => undefined,
  PrimaryGeneratedColumn: () => () => undefined,
  CreateDateColumn: () => () => undefined,
  UpdateDateColumn: () => () => undefined,
  ManyToOne: () => () => undefined,
  JoinColumn: () => () => undefined,
  Table: class Table {},
  TableForeignKey: class TableForeignKey {},
}));

vi.mock('@nestjs/common', () => ({
  Logger: class {
    log = vi.fn();
    warn = vi.fn();
    error = vi.fn();
  },
  Injectable: () => (target: unknown) => target,
}));

vi.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

vi.mock('@nestjs/event-emitter', () => ({
  EventEmitter2: class {
    emit = vi.fn();
  },
}));

describe('WalletService', () => {
  let service: WalletService;
  let transactionRepositoryMock: Mocked<
    Pick<Repository<Transaction>, 'create' | 'save'>
  >;
  let walletBalanceLogRepositoryMock: Mocked<
    Pick<Repository<WalletBalanceLog>, 'create'>
  >;
  let paymentGatewayMock: Mocked<
    Pick<PaymentGatewayClient, 'createDepositIntent'>
  >;
  let eventEmitterMock: Mocked<Pick<EventEmitter2, 'emit'>>;

  beforeEach(() => {
    transactionRepositoryMock = {
      create: vi.fn((transaction: Partial<Transaction>) => ({
        ...transaction,
      }) as Transaction),
      save: vi.fn(async (transaction: Partial<Transaction>) => ({
        ...transaction,
      }) as Transaction),
    } as Mocked<Pick<Repository<Transaction>, 'create' | 'save'>>;

    walletBalanceLogRepositoryMock = {
      create: vi.fn((log: Partial<WalletBalanceLog>) => ({
        ...log,
      })),
    } as Mocked<Pick<Repository<WalletBalanceLog>, 'create'>>;

    paymentGatewayMock = {
      createDepositIntent: vi.fn(),
    } as Mocked<Pick<PaymentGatewayClient, 'createDepositIntent'>>;

    eventEmitterMock = {
      emit: vi.fn(),
    } as Mocked<Pick<EventEmitter2, 'emit'>>;

    service = new WalletService(
      {} as Repository<Wallet>,
      transactionRepositoryMock as unknown as Repository<Transaction>,
      walletBalanceLogRepositoryMock as unknown as Repository<WalletBalanceLog>,
      {} as DataSource,
      paymentGatewayMock as unknown as PaymentGatewayClient,
      eventEmitterMock as unknown as EventEmitter2,
    );
  });

  it('persists the sourceTransactionId when creating a deposit intent', async () => {
    const input = {
      userId: 'user-1',
      amount: '100.00',
      currency: 'USD',
      type: TransactionType.DEPOSIT,
      sourceTransactionId: 'src-123',
    };

    paymentGatewayMock.createDepositIntent.mockResolvedValue({
      id: 'intent-1',
      redirectUrl: 'https://example.com/redirect',
    });

    await service.createDepositIntent(input);

    expect(transactionRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: input.userId,
        amount: '100.00',
        currency: input.currency,
        type: input.type,
        sourceTransactionId: input.sourceTransactionId,
        status: TransactionStatus.PENDING,
        externalId: 'intent-1',
      }),
    );

    const transactionPassedToSave = transactionRepositoryMock.save.mock
      .calls[0][0] as Transaction;
    expect(transactionPassedToSave.sourceTransactionId).toBe(
      input.sourceTransactionId,
    );

    const savedTransaction = await transactionRepositoryMock.save.mock.results[0]
      ?.value;
    expect(savedTransaction).toEqual(
      expect.objectContaining({ sourceTransactionId: input.sourceTransactionId }),
    );
  });

  it('writes a wallet balance log when marking a transaction as successful', async () => {
    const transactionId = 'txn-1';
    const transaction: Transaction = {
      id: transactionId,
      userId: 'user-1',
      currency: 'USD',
      amount: '5.00',
      type: TransactionType.DEPOSIT,
      status: TransactionStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Transaction;

    const wallet: Wallet = {
      id: 'wallet-1',
      userId: 'user-1',
      currency: 'USD',
      availableBalance: '10.00',
      bonusBalance: '0.00',
      lockedBalance: '0.00',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Wallet;

    const walletRepositoryMock = {
      findOne: vi.fn().mockResolvedValue(wallet),
    };

    const walletBalanceLogManagerRepository = {
      save: vi.fn(async (log: WalletBalanceLog) => log),
    };

    const entityManagerMock = {
      findOne: vi.fn(async (entity: unknown) => {
        if (entity === Transaction) {
          return transaction;
        }
        return null;
      }),
      save: vi.fn(async (entity: unknown) => entity),
      getRepository: vi.fn((entity: unknown) => {
        if (entity === Wallet) {
          return walletRepositoryMock;
        }
        if (entity === WalletBalanceLog) {
          return walletBalanceLogManagerRepository;
        }
        throw new Error('Unexpected repository request');
      }),
    };

    const queryRunnerMock = {
      manager: entityManagerMock,
      connect: vi.fn(),
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      rollbackTransaction: vi.fn(),
      release: vi.fn(),
    };

    const dataSourceMock = {
      createQueryRunner: vi.fn(() => queryRunnerMock),
    } as unknown as DataSource;

    const eventEmitterMock = { emit: vi.fn() } as unknown as EventEmitter2;

    const serviceWithMocks = new WalletService(
      {} as Repository<Wallet>,
      {} as Repository<Transaction>,
      walletBalanceLogRepositoryMock as unknown as Repository<WalletBalanceLog>,
      dataSourceMock,
      {} as PaymentGatewayClient,
      eventEmitterMock,
    );

    await serviceWithMocks.markTransactionSuccess(transactionId);

    expect(walletBalanceLogManagerRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        walletId: wallet.id,
        transactionId: transaction.id,
        balanceAfter: '15.00',
      }),
    );

    expect(entityManagerMock.findOne).toHaveBeenCalledWith(Transaction, {
      where: { id: transactionId },
      lock: { mode: 'pessimistic_write' },
    });
  });
});