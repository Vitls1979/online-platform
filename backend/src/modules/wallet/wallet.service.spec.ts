import { DataSource, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WalletService, TransactionType, TransactionStatus } from './wallet.service';
import { Wallet } from './wallet.entity';
import { Transaction } from './wallet-transaction.entity';
import { PaymentGatewayClient } from '../../shared/payment-gateway.client';

describe('WalletService', () => {
  let service: WalletService;
  let transactionRepositoryMock: {
    create: jest.Mock;
    save: jest.Mock;
  };
  let paymentGatewayMock: { createDepositIntent: jest.Mock };

  beforeEach(() => {
    transactionRepositoryMock = {
      create: jest.fn((transaction: Partial<Transaction>) => ({
        ...transaction,
      })),
      save: jest.fn(async (transaction: Partial<Transaction>) => ({
        ...transaction,
      })),
    };

    paymentGatewayMock = {
      createDepositIntent: jest.fn(),
    };

    service = new WalletService(
      {} as Repository<Wallet>,
      transactionRepositoryMock as unknown as Repository<Transaction>,
      {} as DataSource,
      paymentGatewayMock as unknown as PaymentGatewayClient,
      { emit: jest.fn() } as unknown as EventEmitter2,
    );
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

    const savedTransaction =
      transactionRepositoryMock.save.mock.results[0]
        .value as Promise<Partial<Transaction>>;
    await expect(savedTransaction).resolves.toEqual(
      expect.objectContaining({ sourceTransactionId: input.sourceTransactionId }),
    );
  });
});
