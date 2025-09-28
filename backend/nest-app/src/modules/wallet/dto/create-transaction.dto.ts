import { IsIn, IsNotEmpty, IsNumberString, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { walletAccountTypes } from '../wallet-account.entity';
import { walletTransactionTypes } from '../wallet-transaction.entity';

export class CreateTransactionDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsIn(walletAccountTypes)
  accountType!: (typeof walletAccountTypes)[number];

  @IsIn(walletTransactionTypes)
  type!: (typeof walletTransactionTypes)[number];

  @IsString()
  @Length(3, 3)
  currency!: string;

  @IsNumberString()
  amountDelta!: string;

  @IsOptional()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  sourceTransactionId?: string;
}
