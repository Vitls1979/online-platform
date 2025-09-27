import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddSourceTransactionIdToWalletTransactions1717436400000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'wallet_transactions',
      new TableColumn({
        name: 'sourceTransactionId',
        type: 'varchar',
        length: '128',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('wallet_transactions', 'sourceTransactionId');
  }
}
