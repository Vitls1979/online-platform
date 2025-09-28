"use client";

import { useEffect, useMemo, useState } from "react";

import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { BalanceSnapshot, Transaction } from "@/types/balance";

const VISIBLE_TRANSACTION_LIMIT = 6;

type TransactionRow<T> = {
  transaction: T;
  showSeparator: boolean;
};

type TransactionCollection<T> = { transactions: T[] } | undefined;

export function mapVisibleTransactionsToRows<T>(
  data: TransactionCollection<T>,
  visibleLimit: number = VISIBLE_TRANSACTION_LIMIT,
): TransactionRow<T>[] {
  const transactions = data?.transactions ?? [];
  const visibleTransactions = transactions.slice(0, visibleLimit);

  return visibleTransactions.map((transaction, index) => ({
    transaction,
    showSeparator: index < visibleTransactions.length - 1,
  }));
}

type TransactionsTableProps = {
  data?: BalanceSnapshot;
  latestTransaction?: Transaction;
};

export function TransactionsTable({ data, latestTransaction }: TransactionsTableProps) {
  const [transactions, setTransactions] = useState<Transaction[]>(data?.transactions ?? []);

  useEffect(() => {
    setTransactions(data?.transactions ?? []);
  }, [data]);

  useEffect(() => {
    if (!latestTransaction) {
      return;
    }

    setTransactions((prev) => {
      const withoutDuplicate = prev.filter((transaction) => transaction.id !== latestTransaction.id);
      return [latestTransaction, ...withoutDuplicate];
    });
  }, [latestTransaction]);

  const rows = useMemo(
    () => mapVisibleTransactionsToRows<Transaction>({ transactions }),
    [transactions],
  );

  const isLoading = !data && transactions.length === 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="space-y-3">
          {Array.from({ length: VISIBLE_TRANSACTION_LIMIT }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Транзакции пока отсутствуют.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">Последние транзакции</h2>
        <p className="text-sm text-muted-foreground">
          Отображаются последние {Math.min(transactions.length, VISIBLE_TRANSACTION_LIMIT)} операций.
        </p>
      </div>
      <ul>
        {rows.map(({ transaction, showSeparator }) => (
          <li key={transaction.id} className="p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{transaction.description}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(transaction.date).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">
                  {transaction.type === "debit" ? "-" : "+"}
                  {transaction.amount.toFixed(2)} {transaction.currency}
                </p>
              </div>
            </div>
            {showSeparator ? <Separator className="my-4" /> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TransactionsTable;
