import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateUserKycTable1718000001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('user_kyc');
    if (hasTable) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'user_kyc',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
            isUnique: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '32',
            default: `'pending'`,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'submittedAt',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'verifiedAt',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'rejectedAt',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'rejectionReason',
            type: 'varchar',
            length: '512',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'user_kyc',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('user_kyc');
    if (table) {
      const foreignKey = table.foreignKeys.find((fk) => fk.columnNames.includes('userId'));
      if (foreignKey) {
        await queryRunner.dropForeignKey('user_kyc', foreignKey);
      }
      await queryRunner.dropTable('user_kyc');
    }
  }
}
