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
      create: jest.fn(),
      save: jest.fn(),
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

    const createdTransaction: Partial<Transaction> = {};

    paymentGatewayMock.createDepositIntent.mockResolvedValue({
      id: 'intent-1',
      redirectUrl: 'https://example.com/redirect',
    });
    transactionRepositoryMock.create.mockReturnValue(createdTransaction);
    transactionRepositoryMock.save.mockResolvedValue(createdTransaction);

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
  });
});
