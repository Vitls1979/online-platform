import { describe, expect, it } from 'vitest';
import { currencyColumnTransformer } from '../currency-column.transformer';

class GuardedDecimal {
  constructor(private readonly representation: string) {}

  toString(): string {
    return this.representation;
  }

  toNumber(): never {
    throw new Error('toNumber should not be called');
  }
}

describe('currencyColumnTransformer', () => {
  it('serializes decimal-like values via toString without invoking toNumber', () => {
    const value = new GuardedDecimal('1000000000000000.55');

    expect(() => currencyColumnTransformer.to(value)).not.toThrow();
    expect(currencyColumnTransformer.to(value)).toBe('1000000000000000.55');
  });

  it('preserves precision for large balances when persisting and hydrating', () => {
    const largeBalance = '1000000000000000.55';

    const serialized = currencyColumnTransformer.to(largeBalance);
    expect(serialized).toBe(largeBalance);

    const hydrated = currencyColumnTransformer.from(serialized);
    expect(hydrated).toBe(largeBalance);
  });

  it('keeps nullish values untouched', () => {
    expect(currencyColumnTransformer.to(null)).toBeNull();
    expect(currencyColumnTransformer.from(null)).toBeNull();
  });
});
