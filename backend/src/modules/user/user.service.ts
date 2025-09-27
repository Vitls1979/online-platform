import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { KycStatus, UserKyc } from './user-kyc.entity';

export interface CreateUserInput {
  email: string;
  passwordHash: string;
}

export interface UpdateKycStatusInput {
  status: KycStatus;
  metadata?: Record<string, any>;
  rejectionReason?: string | null;
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(UserKyc) private readonly kycRepository: Repository<UserKyc>,
  ) {}

  async createUser(input: CreateUserInput): Promise<User> {
    const existing = await this.userRepository.findOne({ where: { email: input.email } });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const user = this.userRepository.create({
      email: input.email,
      passwordHash: input.passwordHash,
      telegramId: null,
      telegramUsername: null,
      twoFactorEnabled: false,
      totpSecret: null,
      emailVerifiedAt: null,
    });

    const saved = await this.userRepository.save(user);
    await this.ensureKycRecord(saved.id);

    return saved;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email }, relations: ['kyc'] });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id }, relations: ['kyc'] });
  }

  async attachTelegramProfile(userId: string, telegramId: string, username: string | null) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.telegramId = telegramId;
    user.telegramUsername = username;
    await this.userRepository.save(user);

    return user;
  }

  async setTwoFactorSecret(userId: string, secret: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.totpSecret = secret;
    await this.userRepository.save(user);

    return user;
  }

  async enableTwoFactor(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.twoFactorEnabled = true;
    await this.userRepository.save(user);
    return user;
  }

  async updateKycStatus(userId: string, input: UpdateKycStatusInput): Promise<UserKyc> {
    const kyc = await this.ensureKycRecord(userId);

    kyc.status = input.status;
    kyc.metadata = input.metadata ?? kyc.metadata ?? null;

    const now = new Date();

    if (input.status === KycStatus.SUBMITTED) {
      kyc.submittedAt = now;
      kyc.verifiedAt = null;
      kyc.rejectedAt = null;
      kyc.rejectionReason = null;
    } else if (input.status === KycStatus.APPROVED) {
      kyc.verifiedAt = now;
      kyc.rejectedAt = null;
      kyc.rejectionReason = null;
    } else if (input.status === KycStatus.REJECTED) {
      kyc.rejectedAt = now;
      kyc.rejectionReason = input.rejectionReason ?? 'Rejected';
      kyc.verifiedAt = null;
    }

    return this.kycRepository.save(kyc);
  }

  async ensureKycRecord(userId: string): Promise<UserKyc> {
    let record = await this.kycRepository.findOne({ where: { userId } });
    if (record) {
      return record;
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    record = this.kycRepository.create({
      userId,
      status: KycStatus.PENDING,
      metadata: null,
      submittedAt: null,
      verifiedAt: null,
      rejectedAt: null,
      rejectionReason: null,
    });
    return this.kycRepository.save(record);
  }

  sanitizeUser(user: User) {
    const { passwordHash, totpSecret, ...rest } = user;
    return rest;
  }
}
