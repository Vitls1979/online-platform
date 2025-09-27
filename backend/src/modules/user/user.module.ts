import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserKyc } from './user-kyc.entity';
import { UserService } from './user.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserKyc])],
  providers: [UserService],
  exports: [UserService, TypeOrmModule],
})
export class UserModule {}
