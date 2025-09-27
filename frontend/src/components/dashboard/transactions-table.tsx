"use client";

import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import type { BalanceSnapshot } from "@/types/balance";

export function TransactionsTable({ data }: { data?: BalanceSnapshot }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Недавние транзакции</CardTitle>
        <CardDescription>
          Последние операции из BFF. Новые события подгружаются автоматически.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data?.transactions?.length ? (
          data.transactions.slice(0, 6).map((transaction, index) => (
            <div key={transaction.id} className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{transaction.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(transaction.date), "d MMMM yyyy, HH:mm", { locale: ru })}
                  </p>
                </div>
                <div
                  className={
                    transaction.type === "credit"
                      ? "flex items-center gap-2 text-sm font-semibold text-emerald-600"
                      : "flex items-center gap-2 text-sm font-semibold text-rose-600"
                  }
                >
                  {transaction.type === "credit" ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  {formatCurrency(transaction.amount, transaction.currency)}
                </div>
              </div>
              {index < data.transactions.length - 1 ? <Separator /> : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            История операций появится после первой транзакции.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
