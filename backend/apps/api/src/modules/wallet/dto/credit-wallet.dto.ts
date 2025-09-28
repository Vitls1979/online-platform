import { IsEnum, IsNumberString, IsObject, IsOptional, IsString } from 'class-validator';
import { TransactionSource } from '../entities/wallet-transaction.entity';

export class CreditWalletDto {
  @IsString()
  userId!: string;

  @IsNumberString()
  amount!: string;

  @IsString()
  currency!: string;

  @IsString()
  reason!: string;

  @IsEnum(TransactionSource)
  source!: TransactionSource;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
