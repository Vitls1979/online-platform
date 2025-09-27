"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import type { BalanceSnapshot, BalanceStreamEvent } from "@/types/balance";

export function useBalanceStream(enabled: boolean) {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setConnected(false);
      return;
    }

    const source = new EventSource("/api/balance/stream");

    source.onopen = () => {
      setConnected(true);
    };

    source.onmessage = (event) => {
      const update: BalanceStreamEvent = JSON.parse(event.data);

      queryClient.setQueryData<BalanceSnapshot | undefined>(
        ["balance"],
        (current) => {
          const base =
            current ?? {
              currency: "USD",
              available: 0,
              pending: 0,
              updatedAt: update.updatedAt,
              transactions: [],
            };

          const transactions = update.transaction
            ? [update.transaction, ...base.transactions].slice(0, 10)
            : base.transactions;

          return {
            ...base,
            ...update,
            transactions,
          } satisfies BalanceSnapshot;
        },
      );
    };

    source.onerror = () => {
      setConnected(false);
      source.close();
    };

    return () => {
      setConnected(false);
      source.close();
    };
  }, [enabled, queryClient]);

  return connected;
}
