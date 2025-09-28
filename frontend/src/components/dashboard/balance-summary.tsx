"use client";

import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import type { BalanceSnapshot } from "@/types/balance";

function SummarySkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent className="grid gap-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardContent>
    </Card>
  );
}

type BalanceSummaryProps = {
  data?: BalanceSnapshot;
  isLoading: boolean;
  isError: boolean;
};

export function BalanceSummary({ data, isLoading, isError }: BalanceSummaryProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <SummarySkeleton key={index} />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" /> Ошибка загрузки
          </CardTitle>
          <CardDescription>
            Не удалось получить данные баланса. Попробуйте обновить страницу.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const lastUpdated = formatDistanceToNow(new Date(data.updatedAt), {
    addSuffix: true,
    locale: ru,
  });

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" /> Доступно
          </CardTitle>
          <Badge variant="secondary">Обновлено {lastUpdated}</Badge>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold">
            {formatCurrency(data.available, data.currency)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Средства, доступные для немедленных операций.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-600">
            <TrendingUp className="h-5 w-5" /> Поступления
          </CardTitle>
          <CardDescription>Сумма подтвержденных платежей.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold text-emerald-600">
            {formatCurrency(data.available + data.pending, data.currency)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Учитывая ожидаемые зачисления.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-600">
            <TrendingDown className="h-5 w-5" /> В ожидании
          </CardTitle>
          <CardDescription>
            Транзакции на проверке или в обработке.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold text-amber-600">
            {formatCurrency(data.pending, data.currency)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Обновление произойдет автоматически после подтверждения.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
