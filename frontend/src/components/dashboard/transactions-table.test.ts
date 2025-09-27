import { describe, expect, it } from "vitest";

import { mapVisibleTransactionsToRows } from "./transactions-table";

describe("mapVisibleTransactionsToRows", () => {
  it("omits separator for the last visible transaction when there are more than the visible limit", () => {
    const transactions = Array.from({ length: 10 }, (_, index) => ({
      id: `${index}`,
      customer: `Customer ${index}`,
      email: `customer-${index}@example.com`,
      avatarInitials: `C${index}`,
      amount: `$${index}`,
      status: "success" as const,
      date: `2024-06-${index + 1}`,
    }));

    const rows = mapVisibleTransactionsToRows(transactions);

    expect(rows).toHaveLength(6);
    expect(rows[rows.length - 1]?.showSeparator).toBe(false);
    expect(rows.slice(0, -1).every((row) => row.showSeparator)).toBe(true);
  });
});
