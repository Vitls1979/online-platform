import { describe, expect, it } from "vitest";

import { cn, formatCurrency } from "./utils";

describe("utils", () => {
  it("merges class names correctly", () => {
    expect(cn("p-2", false && "hidden", "bg-white")).toBe("p-2 bg-white");
  });

  it("formats currency with USD by default", () => {
    expect(formatCurrency(1234.5)).toBe("$1,234.50");
  });

  it("supports other currencies", () => {
    expect(formatCurrency(99.9, "EUR")).toBe("€99.90");
  });
});
