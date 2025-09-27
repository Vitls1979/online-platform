import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'wallets' })
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ length: 3 })
  currency!: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  availableBalance!: number;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  bonusBalance!: number;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  lockedBalance!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
