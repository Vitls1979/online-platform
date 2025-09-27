import { DataSource, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { vi, Mocked, describe, it, expect, beforeEach } from 'vitest';
import {
  WalletService,
  TransactionType,
  TransactionStatus,
} from './wallet.service';
import { Wallet } from './wallet.entity';
import { Transaction } from './wallet-transaction.entity';
import { PaymentGatewayClient } from '../../shared/payment-gateway.client';

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

vi.mock('typeorm', () => ({
  Entity: () => () => undefined,
  Column: () => () => undefined,
  CreateDateColumn: () => () => undefined,
  UpdateDateColumn: () => () => undefined,
  PrimaryGeneratedColumn: () => () => undefined,
  ManyToOne: () => () => undefined,
  Repository: class {},
  DataSource: class {},
  QueryRunner: class {},
}));

describe('WalletService', () => {
  let service: WalletService;
  let transactionRepositoryMock: Mocked<
    Pick<Repository<Transaction>, 'create' | 'save'>
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

    paymentGatewayMock = {
      createDepositIntent: vi.fn(),
    } as Mocked<Pick<PaymentGatewayClient, 'createDepositIntent'>>;

    eventEmitterMock = {
      emit: vi.fn(),
    } as Mocked<Pick<EventEmitter2, 'emit'>>;

    service = new WalletService(
      {} as Repository<Wallet>,
      transactionRepositoryMock as unknown as Repository<Transaction>,
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
        amount: input.amount,
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
});
