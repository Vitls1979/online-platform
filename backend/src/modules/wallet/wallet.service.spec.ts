import { DataSource, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@nestjs/common', () => {
  class MockLogger {
    constructor(public readonly context?: string) {}
    log(..._args: unknown[]) {}
    error(..._args: unknown[]) {}
    warn(..._args: unknown[]) {}
  }

  return {
    Injectable: () => () => undefined,
    Logger: MockLogger,
  };
});

vi.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

vi.mock('@nestjs/event-emitter', () => ({
  EventEmitter2: class {
    emit(..._args: unknown[]) {}
  },
}));

vi.mock('typeorm', () => {
  const noopDecorator = () => () => undefined;
  class DataSource {}
  class Repository<T> {}
  class QueryRunner {}

  return {
    DataSource,
    Repository,
    QueryRunner,
    Entity: noopDecorator,
    Column: noopDecorator,
    PrimaryGeneratedColumn: noopDecorator,
    CreateDateColumn: noopDecorator,
    UpdateDateColumn: noopDecorator,
    ManyToOne: noopDecorator,
  };
});
import { WalletService, TransactionType, TransactionStatus } from './wallet.service';
import { Wallet } from './wallet.entity';
import { Transaction } from './wallet-transaction.entity';
import {
  PaymentGatewayClient,
  PaymentGatewayError,
} from '../../shared/payment-gateway.client';

describe('WalletService', () => {
  let service: WalletService;
  let transactionRepositoryMock: {
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  let paymentGatewayMock: { createDepositIntent: ReturnType<typeof vi.fn> };
  let loggerErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    transactionRepositoryMock = {
      create: vi.fn((transaction: Partial<Transaction>) => ({
        ...transaction,
      })),
      save: vi.fn(async (transaction: Partial<Transaction>) => ({
        ...transaction,
      })),
    };

    paymentGatewayMock = {
      createDepositIntent: vi.fn(),
    };

    service = new WalletService(
      {} as Repository<Wallet>,
      transactionRepositoryMock as unknown as Repository<Transaction>,
      {} as DataSource,
      paymentGatewayMock as unknown as PaymentGatewayClient,
      { emit: vi.fn() } as unknown as EventEmitter2,
    );

    const logger = (service as unknown as { logger: { error: (...args: unknown[]) => void } }).logger;
    loggerErrorSpy = vi.spyOn(logger, 'error');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('persists the sourceTransactionId when creating a deposit intent', async () => {
    const input = {
      userId: 'user-1',
      amount: 100,
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

    const savedTransaction =
      transactionRepositoryMock.save.mock.results[0]
        .value as Partial<Transaction>;
    expect(savedTransaction).toEqual(
      expect.objectContaining({
        sourceTransactionId: input.sourceTransactionId,
        amount: '100.00',
      }),
    );
  });

  it('logs and rethrows payment gateway errors', async () => {
    const input = {
      userId: 'user-1',
      amount: '50.00',
      currency: 'USD',
      type: TransactionType.DEPOSIT,
    };

    const gatewayError = new PaymentGatewayError('stripe failure', 400, {
      error: { message: 'Card declined' },
    });
    paymentGatewayMock.createDepositIntent.mockRejectedValue(gatewayError);

    await expect(service.createDepositIntent(input)).rejects.toBe(gatewayError);

    expect(transactionRepositoryMock.create).not.toHaveBeenCalled();
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Payment provider rejected deposit intent for user'),
    );
  });

  it('logs unexpected errors and rethrows them', async () => {
    const input = {
      userId: 'user-2',
      amount: '25.00',
      currency: 'EUR',
      type: TransactionType.DEPOSIT,
    };

    const unexpectedError = new Error('network down');
    paymentGatewayMock.createDepositIntent.mockRejectedValue(unexpectedError);

    await expect(service.createDepositIntent(input)).rejects.toBe(unexpectedError);

    expect(transactionRepositoryMock.create).not.toHaveBeenCalled();
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unexpected error when creating deposit intent for user'),
    );
  });
});
