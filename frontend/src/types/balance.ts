export type Transaction = {
  id: string;
  type: "credit" | "debit";
  amount: number;
  currency: string;
  description: string;
  date: string;
};

export type BalanceSnapshot = {
  currency: string;
  available: number;
  pending: number;
  updatedAt: string;
  transactions: Transaction[];
};

export type BalanceStreamEvent = {
  available: number;
  pending: number;
  updatedAt: string;
  transaction?: Transaction;
};
