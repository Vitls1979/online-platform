import {
  Column,
  ColumnType,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Wallet } from './wallet.entity';
import { currencyColumnTransformer } from './currency-column.transformer';
import { TransactionStatus, TransactionType } from './wallet.service';

@Entity({ name: 'wallet_transactions' })
export class Transaction {
  private static readonly timestampColumnType: ColumnType =
    process.env.NODE_ENV === 'test' ? 'datetime' : 'timestamptz';

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => Wallet)
  wallet?: Wallet;

  @Column({ type: 'varchar', length: 3 })
  currency!: string;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 2,
    transformer: currencyColumnTransformer,
  })
  /** Stored as a string to avoid precision loss for large transaction amounts. */
  amount!: string;

  @Column({ type: 'enum', enum: TransactionType })
  type!: TransactionType;

  @Column({ type: 'enum', enum: TransactionStatus })
  status!: TransactionStatus;

  private static readonly metadataColumnType: ColumnType =
    process.env.NODE_ENV === 'test' ? 'simple-json' : 'jsonb';

  @Column({ type: Transaction.metadataColumnType, nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ type: 'varchar', nullable: true })
  externalId?: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  sourceTransactionId?: string | null;

  @Column({ type: 'varchar', nullable: true })
  failureReason?: string;

  @CreateDateColumn({ type: Transaction.timestampColumnType })
  createdAt!: Date;

  @UpdateDateColumn({ type: Transaction.timestampColumnType })
  updatedAt!: Date;
}
