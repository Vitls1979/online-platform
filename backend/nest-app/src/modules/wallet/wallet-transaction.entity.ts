import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import Decimal from 'decimal.js-light';
import { WalletAccountType } from './wallet-account.entity';

export const walletTransactionTypes = ['deposit', 'withdrawal', 'bet', 'win', 'bonus', 'adjustment'] as const;
export type WalletTransactionType = (typeof walletTransactionTypes)[number];

@Entity({ name: 'wallet_transactions' })
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  walletAccountId!: string;

  @Column('uuid')
  userId!: string;

  @Column({ length: 3 })
  currency!: string;

  @Column({ type: 'varchar', length: 16 })
  type!: WalletTransactionType;

  @Column({ type: 'varchar', length: 16 })
  accountType!: WalletAccountType;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 2,
    transformer: {
      to: (value: Decimal) => value.toNumber(),
      from: (value: string | number) => new Decimal(value),
    },
  })
  amount!: Decimal;

  @Column({ type: 'varchar', length: 16 })
  status!: 'pending' | 'success' | 'failed' | 'cancelled';

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ type: 'varchar', length: 128 })
  idempotencyKey!: string;

  @Column({ type: 'varchar', length: 128 })
  performedBy!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
