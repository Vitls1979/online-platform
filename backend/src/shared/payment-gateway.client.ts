import { Injectable, Logger } from '@nestjs/common';
import { fetch, type RequestInit, type Response } from 'undici';

export class PaymentGatewayError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

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

type PaymentProvider = 'stripe';

interface StripeConfig {
  provider: 'stripe';
  secretKey: string;
  successUrl: string;
  cancelUrl: string;
  baseUrl: string;
}

type PaymentGatewayConfig = StripeConfig;

@Injectable()
export class PaymentGatewayClient {
  private readonly logger = new Logger(PaymentGatewayClient.name);
  private readonly config: PaymentGatewayConfig;

  constructor(private readonly httpClient: typeof fetch = fetch) {
    this.config = this.loadConfig();
  }

  async createDepositIntent(
    payload: CreateDepositIntentPayload,
  ): Promise<DepositIntent> {
    switch (this.config.provider) {
      case 'stripe':
        return this.createStripeCheckoutSession(payload, this.config);
      default:
        throw new PaymentGatewayError(
          `Unsupported payment provider: ${(this.config as PaymentGatewayConfig).provider}`,
        );
    }
  }

  private loadConfig(): PaymentGatewayConfig {
    const provider = (process.env.PAYMENT_PROVIDER ?? 'stripe') as PaymentProvider;

    if (provider !== 'stripe') {
      throw new PaymentGatewayError(`Unsupported payment provider: ${provider}`);
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    const successUrl = process.env.STRIPE_SUCCESS_URL;
    const cancelUrl = process.env.STRIPE_CANCEL_URL;
    const baseUrl = process.env.STRIPE_API_BASE_URL ?? 'https://api.stripe.com';

    if (!secretKey || !successUrl || !cancelUrl) {
      throw new PaymentGatewayError(
        'Stripe configuration is incomplete. Please set STRIPE_SECRET_KEY, STRIPE_SUCCESS_URL and STRIPE_CANCEL_URL environment variables.',
      );
    }

    return {
      provider,
      secretKey,
      successUrl,
      cancelUrl,
      baseUrl,
    };
  }

  private async createStripeCheckoutSession(
    payload: CreateDepositIntentPayload,
    config: StripeConfig,
  ): Promise<DepositIntent> {
    const amountInMinorUnits = Math.round(Number(payload.amount) * 100);
    if (Number.isNaN(amountInMinorUnits)) {
      throw new PaymentGatewayError('Amount must be a valid number');
    }

    const body = new URLSearchParams({
      mode: 'payment',
      success_url: config.successUrl,
      cancel_url: config.cancelUrl,
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': payload.currency.toLowerCase(),
      'line_items[0][price_data][product_data][name]': `Deposit for user ${payload.userId}`,
      'line_items[0][price_data][unit_amount]': String(amountInMinorUnits),
    });

    if (payload.metadata) {
      Object.entries(payload.metadata).forEach(([key, value]) => {
        body.append(`metadata[${key}]`, this.stringifyMetadataValue(value));
      });
    }

    const response = await this.fetchWithHandling(
      `${config.baseUrl}/v1/checkout/sessions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      },
    );

    const data = (await response.json()) as { id?: string; url?: string };

    if (!data?.id || !data?.url) {
      throw new PaymentGatewayError(
        'Stripe response is missing required fields',
        response.status,
        data,
      );
    }

    return { id: data.id, redirectUrl: data.url };
  }

  private async fetchWithHandling(url: string, init: RequestInit) {
    try {
      const response = await this.httpClient(url, init);
      if (!response.ok) {
        const details = await this.parseErrorBody(response);
        throw new PaymentGatewayError(
          `Stripe request failed with status ${response.status}`,
          response.status,
          details,
        );
      }
      return response;
    } catch (error: unknown) {
      if (error instanceof PaymentGatewayError) {
        this.logger.error(error.message, (error as Error).stack);
        throw error;
      }

      const wrappedError = new PaymentGatewayError(
        'Failed to communicate with Stripe',
        undefined,
        error,
      );
      this.logger.error(wrappedError.message, (error as Error)?.stack);
      throw wrappedError;
    }
  }

  private async parseErrorBody(response: Response) {
    try {
      return await response.json();
    } catch (error) {
      try {
        return await response.text();
      } catch {
        return undefined;
      }
    }
  }

  private stringifyMetadataValue(value: unknown): string {
    if (value == null) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    return JSON.stringify(value);
  }
}
