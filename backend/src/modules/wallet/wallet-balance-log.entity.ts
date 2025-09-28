import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Wallet } from './wallet.entity';
import { Transaction } from './wallet-transaction.entity';
import { currencyColumnTransformer } from './currency-column.transformer';

@Entity({ name: 'wallet_balance_log' })
export class WalletBalanceLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  walletId!: string;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'walletId' })
  wallet?: Wallet;

  @Column({ type: 'uuid' })
  transactionId!: string;

  @ManyToOne(() => Transaction)
  @JoinColumn({ name: 'transactionId' })
  transaction?: Transaction;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 2,
    transformer: currencyColumnTransformer,
  })
  balanceAfter!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
