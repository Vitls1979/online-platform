import type { BalanceSnapshot, BalanceStreamEvent, Transaction } from "@/types/balance";

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: "tx-101",
    type: "credit",
    amount: 1520.45,
    currency: "USD",
    description: "Пополнение от клиента ACME",
    date: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "tx-100",
    type: "debit",
    amount: -420.12,
    currency: "USD",
    description: "Оплата сервисов облачной инфраструктуры",
    date: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: "tx-099",
    type: "credit",
    amount: 980.0,
    currency: "USD",
    description: "Аванс по контракту Globex",
    date: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
];

let snapshot: BalanceSnapshot = {
  currency: "USD",
  available: 12450.87,
  pending: 2050.25,
  updatedAt: new Date().toISOString(),
  transactions: INITIAL_TRANSACTIONS,
};

function createTransaction(): Transaction {
  const isCredit = Math.random() > 0.4;
  const amount = Number((Math.random() * 500 + 50).toFixed(2));
  const id = `tx-${Math.floor(Math.random() * 10000)}`;

  return {
    id,
    type: isCredit ? "credit" : "debit",
    amount: isCredit ? amount : amount * -1,
    currency: snapshot.currency,
    description: isCredit
      ? "Поступление по подписке"
      : "Списание расходов на маркетинг",
    date: new Date().toISOString(),
  };
}

export function getBalance(): BalanceSnapshot {
  return snapshot;
}

export function updateBalance(): BalanceStreamEvent {
  const transaction = createTransaction();
  const available = snapshot.available + transaction.amount;
  const pending = Math.max(snapshot.pending + Math.random() * 200 - 100, 0);

  snapshot = {
    ...snapshot,
    available: Number(available.toFixed(2)),
    pending: Number(pending.toFixed(2)),
    updatedAt: new Date().toISOString(),
    transactions: [transaction, ...snapshot.transactions].slice(0, 10),
  };

  return {
    available: snapshot.available,
    pending: snapshot.pending,
    updatedAt: snapshot.updatedAt,
    transaction,
  };
}
