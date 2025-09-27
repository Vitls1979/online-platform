export interface Stringifiable {
  toString(): string;
}

const hasCustomToString = (value: unknown): value is Stringifiable => {
  if (value === null || value === undefined) {
    return false;
  }

  const candidate = value as Partial<Stringifiable>;
  if (typeof candidate.toString !== 'function') {
    return false;
  }

  return candidate.toString !== Object.prototype.toString;
};

/**
 * Ensures currency values are persisted using their string representation.
 * This avoids precision loss when working with large decimals that may expose
 * a `toNumber()` helper (e.g. Decimal.js instances) by relying on `toString()`.
 */
export const currencyColumnTransformer = {
  to(value?: string | number | bigint | Stringifiable | null) {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'bigint') {
      return value.toString();
    }

    if (hasCustomToString(value)) {
      return value.toString();
    }

    return String(value);
  },
  from(value?: string | null) {
    if (value === null || value === undefined) {
      return value as undefined | null;
    }

    return value;
  },
};
