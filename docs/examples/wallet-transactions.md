# Wallet transaction persistence example

The snippet below shows how to persist a transaction with a `sourceTransactionId` and fetch it back from PostgreSQL once the column is available in the schema.

```sql
-- create sample transaction
INSERT INTO wallet_transactions (
  "userId",
  "currency",
  amount,
  type,
  status,
  "sourceTransactionId",
  metadata
) VALUES (
  'f2e8f82b-7e51-4c81-b405-865d7a648f07',
  'USD',
  500.00,
  'deposit',
  'pending',
  'stripe_pi_1234567890',
  '{"intentId": "pi_1234567890"}'
) RETURNING id;

-- fetch the row and ensure the source identifier is present
SELECT
  id,
  "userId",
  "sourceTransactionId"
FROM wallet_transactions
WHERE id = '<returned id>';
```

The second query will return the value `stripe_pi_1234567890` in the `sourceTransactionId` column, confirming that the value is persisted and retrieved correctly.
