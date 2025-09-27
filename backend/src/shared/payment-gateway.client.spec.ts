import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PaymentGatewayClient,
  PaymentGatewayError,
} from './payment-gateway.client';

vi.mock('@nestjs/common', () => {
  class MockLogger {
    constructor(public readonly context?: string) {}
    log(..._args: unknown[]) {}
    error(..._args: unknown[]) {}
    warn(..._args: unknown[]) {}
  }

  return {
    Injectable: () => () => undefined,
    Logger: MockLogger,
  };
});

const originalEnv = { ...process.env };

describe('PaymentGatewayClient (Stripe)', () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      PAYMENT_PROVIDER: 'stripe',
      STRIPE_SECRET_KEY: 'sk_test_123',
      STRIPE_SUCCESS_URL: 'https://example.com/success',
      STRIPE_CANCEL_URL: 'https://example.com/cancel',
      STRIPE_API_BASE_URL: 'https://api.stripe.test',
    };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('throws when configuration is incomplete', () => {
    process.env = {
      ...originalEnv,
      PAYMENT_PROVIDER: 'stripe',
      STRIPE_SECRET_KEY: '',
      STRIPE_SUCCESS_URL: '',
      STRIPE_CANCEL_URL: '',
    };

    expect(() => new PaymentGatewayClient()).toThrowError(
      /Stripe configuration is incomplete/,
    );
  });

  it('creates a checkout session and returns redirect data', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.test/pay/cs_test_123',
      }),
    });

    const client = new PaymentGatewayClient(fetchMock as any);

    const result = await client.createDepositIntent({
      userId: 'user-1',
      amount: '10.50',
      currency: 'USD',
      metadata: { orderId: 'order-1', nested: { a: 1 } },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.stripe.test/v1/checkout/sessions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk_test_123',
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
      }),
    );

    const body = (fetchMock.mock.calls[0]?.[1]?.body ?? '') as URLSearchParams;
    expect(body.toString()).toContain('line_items%5B0%5D%5Bprice_data%5D%5Bcurrency%5D=usd');
    expect(body.toString()).toContain('metadata%5BorderId%5D=order-1');

    expect(result).toEqual({
      id: 'cs_test_123',
      redirectUrl: 'https://checkout.stripe.test/pay/cs_test_123',
    });
  });

  it('throws PaymentGatewayError on Stripe error responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: 'Invalid amount' } }),
      text: async () => 'Invalid amount',
    });

    const client = new PaymentGatewayClient(fetchMock as any);

    await expect(
      client.createDepositIntent({
        userId: 'user-2',
        amount: '5.00',
        currency: 'EUR',
      }),
    ).rejects.toMatchObject({
      message: 'Stripe request failed with status 400',
      status: 400,
      details: { error: { message: 'Invalid amount' } },
    });
  });

  it('wraps network failures into PaymentGatewayError', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network down'));

    const client = new PaymentGatewayClient(fetchMock as any);

    await expect(
      client.createDepositIntent({
        userId: 'user-3',
        amount: '12.00',
        currency: 'USD',
      }),
    ).rejects.toMatchObject({
      message: 'Failed to communicate with Stripe',
      details: expect.any(Error),
    });
  });
});
