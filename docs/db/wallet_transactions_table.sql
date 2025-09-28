-- Schema fragment for the wallet_transactions table
CREATE TABLE wallet_transactions (
  id uuid PRIMARY KEY,
  "userId" uuid NOT NULL,
  "walletId" uuid,
  currency varchar(3) NOT NULL,
  amount numeric(18, 2) NOT NULL,
  type varchar(32) NOT NULL,
  status varchar(32) NOT NULL,
  metadata jsonb,
  "externalId" varchar(255),
  "sourceTransactionId" varchar(128),
  "failureReason" varchar(255),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

-- When updating an existing installation, apply the following statement:
-- ALTER TABLE wallet_transactions ADD COLUMN "sourceTransactionId" varchar(128);
