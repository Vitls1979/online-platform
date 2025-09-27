import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { currencyColumnTransformer } from './currency-column.transformer';

@Entity({ name: 'wallets' })
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 3 })
  currency!: string;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: currencyColumnTransformer,
  })
  /** Stored as a string to avoid precision loss for large balances. */
  availableBalance!: string;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: currencyColumnTransformer,
  })
  /** Stored as a string to avoid precision loss for large balances. */
  bonusBalance!: string;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: currencyColumnTransformer,
  })
  /** Stored as a string to avoid precision loss for large balances. */
  lockedBalance!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
