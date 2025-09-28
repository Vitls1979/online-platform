export enum TransactionKind {
  Credit = 'credit',
  Debit = 'debit',
}

export interface LedgerMutation {
  transactionId: string;
  userId: string;
  amount: string; // Stored as string to preserve precision
  currency: string;
  reason: string;
  metadata?: Record<string, unknown>;
}

export interface BalanceSnapshot {
  userId: string;
  available: string;
  bonus: string;
  locked: string;
  currency: string;
  updatedAt: string;
}
