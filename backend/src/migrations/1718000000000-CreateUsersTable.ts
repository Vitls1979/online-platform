import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateUsersTable1718000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    const hasTable = await queryRunner.hasTable('users');
    if (hasTable) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'passwordHash',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'telegramId',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          {
            name: 'telegramUsername',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'twoFactorEnabled',
            type: 'boolean',
            default: false,
          },
          {
            name: 'totpSecret',
            type: 'varchar',
            length: '128',
            isNullable: true,
          },
          {
            name: 'emailVerifiedAt',
            type: 'timestamptz',
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('users');
    if (hasTable) {
      await queryRunner.dropTable('users');
    }
  }
}
