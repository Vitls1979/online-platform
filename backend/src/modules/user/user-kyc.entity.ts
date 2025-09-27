import {
  Column,
  ColumnType,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum KycStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity({ name: 'user_kyc' })
export class UserKyc {
  private static readonly timestampColumnType: ColumnType =
    process.env.NODE_ENV === 'test' ? 'datetime' : 'timestamptz';

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => User, (user) => user.kyc, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 32, default: KycStatus.PENDING })
  status!: KycStatus;

  private static readonly metadataColumnType: ColumnType =
    process.env.NODE_ENV === 'test' ? 'simple-json' : 'jsonb';

  @Column({ type: UserKyc.metadataColumnType, nullable: true })
  metadata!: Record<string, any> | null;

  @Column({ type: UserKyc.timestampColumnType, nullable: true })
  submittedAt!: Date | null;

  @Column({ type: UserKyc.timestampColumnType, nullable: true })
  verifiedAt!: Date | null;

  @Column({ type: UserKyc.timestampColumnType, nullable: true })
  rejectedAt!: Date | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  rejectionReason!: string | null;

  @CreateDateColumn({ type: UserKyc.timestampColumnType })
  createdAt!: Date;

  @UpdateDateColumn({ type: UserKyc.timestampColumnType })
  updatedAt!: Date;
}
