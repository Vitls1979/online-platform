import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { BalanceSnapshot, LedgerMutation } from './wallet.types';

/**
 * WalletLedger abstracts the persistence layer for wallet operations.
 * In production it would rely on PostgreSQL transactions with row-level locking.
 */
@Injectable()
export class WalletLedger {
  private readonly balances = new Map<string, BalanceSnapshot>();

  async fetchBalance(userId: string): Promise<BalanceSnapshot> {
    return this.balances.get(userId) ?? {
      userId,
      available: '0',
      bonus: '0',
      locked: '0',
      currency: 'USD',
      updatedAt: new Date().toISOString(),
    };
  }

  async applyCredit(mutation: LedgerMutation): Promise<BalanceSnapshot> {
    const snapshot = await this.fetchBalance(mutation.userId);
    const available = new Decimal(snapshot.available).add(mutation.amount).toFixed(2);

    const updated: BalanceSnapshot = {
      ...snapshot,
      available,
      updatedAt: new Date().toISOString(),
    };

    this.balances.set(mutation.userId, updated);
    return updated;
  }

  async applyDebit(mutation: LedgerMutation & { lockFunds: boolean }): Promise<BalanceSnapshot> {
    const snapshot = await this.fetchBalance(mutation.userId);
    const current = new Decimal(snapshot.available);
    const amount = new Decimal(mutation.amount);

    if (current.lessThan(amount)) {
      throw new Error('Insufficient balance');
    }

    let available = current.sub(amount);
    let locked = new Decimal(snapshot.locked);

    if (mutation.lockFunds) {
      locked = locked.add(amount);
    }

    const updated: BalanceSnapshot = {
      ...snapshot,
      available: available.toFixed(2),
      locked: locked.toFixed(2),
      updatedAt: new Date().toISOString(),
    };

    this.balances.set(mutation.userId, updated);
    return updated;
  }
}
