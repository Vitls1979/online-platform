'use client';

import { useEffect, useState } from 'react';
import { useBalanceStream, BalanceStreamStatus } from '@/hooks/use-balance-stream';
import { Transaction } from '@/lib/types';
import { Skeleton } from "@/components/ui/skeleton";

// A component to display the real-time balance and connection status
const BalanceDisplay = ({ balance, status }: { balance: number | null, status: BalanceStreamStatus }) => {
  const statusIndicatorColor = {
    connecting: 'text-yellow-500',
    active: 'text-green-500',
    disconnected: 'text-red-500',
  }[status];

  return (
    <div className="mb-4 text-center">
      <h2 className="text-2xl font-bold">
        {balance !== null ? `$${balance.toFixed(2)}` : <Skeleton className="h-8 w-32 inline-block" />}
      </h2>
      <p className={`text-sm font-semibold ${statusIndicatorColor}`}>
        {status.toUpperCase()}
      </p>
    </div>
  );
};

// A component to display a list of transactions (placeholder)
const TransactionList = ({ transactions }: { transactions: Transaction[] }) => {
  if (transactions.length === 0) {
    return <p className="text-center text-gray-500">No transactions yet.</p>;
  }
  // This would be fleshed out to display a nice table or list
  return (
    <ul>
      {transactions.map((tx) => (
        <li key={tx.id}>{tx.description}: ${tx.amount}</li>
      ))}
    </ul>
  );
};


export default function TransactionsTable() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const { balance, status, lastMessage } = useBalanceStream({
        onMessage: (message) => {
            console.log('Received transaction:', message);
            if (message.type === 'transaction') {
                setTransactions(prev => [message.data, ...prev]);
            }
        },
    });

    useEffect(() => {
        // Here you would typically fetch initial transactions
        // For now, we just rely on the stream
    }, []);

    return (
        <div>
            <BalanceDisplay balance={balance} status={status} />
            <TransactionList transactions={transactions} />
        </div>
    );
}