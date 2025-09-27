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

const canBeReducedToPrimitive = (
  value: unknown,
): value is { valueOf(): string | number | bigint | null | undefined } => {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value !== 'object') {
    return false;
  }

  const candidate = value as { valueOf?: () => unknown };
  return typeof candidate.valueOf === 'function';
};

const toDatabaseString = (value: unknown): string => {
  if (typeof value === 'string') {
    return value.toString();
  }

  if (typeof value === 'number' || typeof value === 'bigint') {
    return value.toString();
  }

  if (hasCustomToString(value)) {
    return value.toString();
  }

  if (canBeReducedToPrimitive(value)) {
    const primitive = value.valueOf();
    if (primitive !== value && primitive !== null && primitive !== undefined) {
      return toDatabaseString(primitive);
    }
  }

  return String(value);
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

    return toDatabaseString(value);
  },
  from(value?: string | null) {
    if (value === null || value === undefined) {
      return value as undefined | null;
    }

    return value;
  },
};
