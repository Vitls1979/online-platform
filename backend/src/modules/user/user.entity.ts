import {
  Column,
  ColumnType,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserKyc } from './user-kyc.entity';

@Entity({ name: 'users' })
export class User {
  private static readonly timestampColumnType: ColumnType =
    process.env.NODE_ENV === 'test' ? 'datetime' : 'timestamptz';

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  telegramId!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  telegramUsername!: string | null;

  @Column({ type: 'boolean', default: false })
  twoFactorEnabled!: boolean;

  @Column({ type: 'varchar', length: 128, nullable: true })
  totpSecret!: string | null;

  @Column({ type: User.timestampColumnType, nullable: true })
  emailVerifiedAt!: Date | null;

  @OneToOne(() => UserKyc, (kyc) => kyc.user)
  kyc!: UserKyc;

  @CreateDateColumn({ type: User.timestampColumnType })
  createdAt!: Date;

  @UpdateDateColumn({ type: User.timestampColumnType })
  updatedAt!: Date;
}
