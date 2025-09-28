const MAX_VISIBLE_TRANSACTIONS = 6;

type Transaction = {
  id: string;
  customer: string;
  email: string;
  avatarInitials: string;
  amount: string;
  status: "success" | "processing" | "failed";
  date: string;
};

type TransactionRow = {
  transaction: Transaction;
  showSeparator: boolean;
};

type TransactionsData = {
  transactions: Transaction[];
};

export function mapVisibleTransactionsToRows(
  data: TransactionsData,
): TransactionRow[] {
  const visibleTransactions = data.transactions.slice(
    0,
    MAX_VISIBLE_TRANSACTIONS,
  );
  const visibleTransactionsLength = visibleTransactions.length;

  return visibleTransactions.map((transaction, index) => ({
    transaction,
    showSeparator: index < visibleTransactionsLength - 1,
  }));
}

export const __testables__ = {
  MAX_VISIBLE_TRANSACTIONS,
};
