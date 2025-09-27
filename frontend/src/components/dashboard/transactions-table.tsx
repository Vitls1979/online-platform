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

function getVisibleTransactions(transactions: Transaction[]): Transaction[] {
  return transactions.slice(0, MAX_VISIBLE_TRANSACTIONS);
}

export function mapVisibleTransactionsToRows(
  transactions: Transaction[],
): TransactionRow[] {
  const visibleTransactions = getVisibleTransactions(transactions);

  return visibleTransactions.map((transaction, index) => ({
    transaction,
    showSeparator: index < visibleTransactions.length - 1,
  }));
}

export const __testables__ = {
  getVisibleTransactions,
  MAX_VISIBLE_TRANSACTIONS,
};
