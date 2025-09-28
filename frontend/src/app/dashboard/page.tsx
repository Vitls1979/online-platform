import type { Metadata } from "next";

import { BalanceDashboard } from "@/components/dashboard/balance-dashboard";

export const metadata: Metadata = {
  title: "Дашборд баланса",
};

export default function DashboardPage() {
  return (
    <main className="container space-y-10 py-10">
      <BalanceDashboard />
    </main>
  );
}
