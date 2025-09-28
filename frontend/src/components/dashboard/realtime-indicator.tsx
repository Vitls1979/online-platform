"use client";

import { Dot } from "lucide-react";

import { cn } from "@/lib/utils";

export function RealtimeIndicator({ active }: { active: boolean }) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-600"
          : "border-muted bg-background text-muted-foreground",
      )}
    >
      <Dot className={cn("h-5 w-5", active ? "text-emerald-500" : "text-muted-foreground")} />
      {active ? "Стрим подключен" : "Ожидание события"}
    </div>
  );
}
