import { Injectable } from '@nestjs/common';

export interface DepositIntent {
  id: string;
  redirectUrl: string;
}

export interface CreateDepositIntentPayload {
  userId: string;
  amount: string;
  currency: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class PaymentGatewayClient {
  async createDepositIntent(payload: CreateDepositIntentPayload): Promise<DepositIntent> {
    // TODO: Реализовать реальную интеграцию с платежным шлюзом (Stripe, PayPal и т.д.)
    return {
      id: `intent_${Date.now()}`,
      redirectUrl: `https://payment-gateway.example/checkout/${Date.now()}`,
    };
  }
}
