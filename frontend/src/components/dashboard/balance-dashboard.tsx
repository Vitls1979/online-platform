"use client";

import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useBalanceStream } from "@/hooks/use-balance-stream";
import { fetchBalance } from "@/lib/api";

import { BalanceSummary } from "./balance-summary";
import { RealtimeIndicator } from "./realtime-indicator";
import { TransactionsTable } from "./transactions-table";

export function BalanceDashboard() {
  const {
    data,
    isPending,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["balance"],
    queryFn: fetchBalance,
  });

  const { status, lastMessage } = useBalanceStream();
  const isRealtimeActive = status === "connected";
  const latestTransaction = lastMessage?.type === "transaction" ? lastMessage.data : undefined;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Баланс компании</h1>
          <p className="text-sm text-muted-foreground">
            Сводка по счетам и транзакциям, синхронизированная с BFF. Изменения прилетают через SSE.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <RealtimeIndicator active={isRealtimeActive} />
          <Button variant="outline" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {isRefetching ? "Обновляем..." : "Обновить"}
          </Button>
        </div>
      </div>
      <BalanceSummary data={data} isLoading={isPending} isError={isError} />
      <TransactionsTable data={data} latestTransaction={latestTransaction} />
    </div>
  );
}
