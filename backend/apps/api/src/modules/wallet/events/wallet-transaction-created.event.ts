import { TransactionKind } from '../wallet.types';

interface Payload {
  transactionId: string;
  userId: string;
  amount: string;
  currency: string;
  kind: TransactionKind;
  source: string;
  metadata?: Record<string, unknown>;
}

export class WalletTransactionCreatedEvent {
  constructor(public readonly payload: Payload) {}
}
