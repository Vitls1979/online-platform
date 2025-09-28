import { Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';

export interface WalletTransactionCompletedEvent {
  transactionId: string;
  userId: string;
  accountType: string;
  amount: string;
  currency: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class WalletEventPublisher {
  private readonly topic = 'wallet.transaction.completed';

  constructor(private readonly kafkaClient: ClientKafka) {}

  async publishTransactionCompleted(event: WalletTransactionCompletedEvent): Promise<void> {
    await this.kafkaClient.emit(this.topic, {
      key: event.userId,
      value: JSON.stringify(event),
    });
  }
}
