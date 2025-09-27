import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Wallet } from './wallet.entity';
import { currencyColumnTransformer } from './currency-column.transformer';
import { TransactionStatus, TransactionType } from './wallet.service';

@Entity({ name: 'wallet_transactions' })
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => Wallet)
  wallet?: Wallet;

  @Column({ length: 3 })
  currency!: string;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 2,
    transformer: currencyColumnTransformer,
  })
  amount!: string;

  @Column({ type: 'enum', enum: TransactionType })
  type!: TransactionType;

  @Column({ type: 'enum', enum: TransactionStatus })
  status!: TransactionStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ nullable: true })
  externalId?: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  sourceTransactionId?: string;

  @Column({ nullable: true })
  failureReason?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
