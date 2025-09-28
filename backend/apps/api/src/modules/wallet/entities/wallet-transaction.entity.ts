export enum TransactionSource {
  Deposit = 'deposit',
  Withdrawal = 'withdrawal',
  Bet = 'bet',
  Win = 'win',
  Bonus = 'bonus',
  Adjustment = 'adjustment',
}

export interface WalletTransactionEntity {
  id: string;
  userId: string;
  amount: string;
  currency: string;
  kind: 'credit' | 'debit';
  source: TransactionSource;
  reason: string;
  balanceAfter: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}
