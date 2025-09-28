import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import Decimal from 'decimal.js-light';

export const walletAccountTypes = ['main', 'bonus', 'locked'] as const;
export type WalletAccountType = (typeof walletAccountTypes)[number];

@Entity({ name: 'wallet_accounts' })
export class WalletAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @Column({ length: 3 })
  currency!: string;

  @Column({ type: 'varchar', length: 16 })
  type!: WalletAccountType;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 2,
    transformer: {
      to: (value: Decimal) => value.toNumber(),
      from: (value: string | number) => new Decimal(value),
    },
  })
  balance!: Decimal;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
