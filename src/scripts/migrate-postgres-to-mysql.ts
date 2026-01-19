// src/scripts/migrate-postgres-to-mysql.ts
import { PrismaClient as MysqlClient } from '@prisma/client';
import { Client as PgClient } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

// Interface para mapeamento de enum
interface EnumMapping {
  [key: string]: {
    [value: string]: string;
  };
}

// Mapeamento de tipos específicos
const enumMappings: EnumMapping = {
  GameType: {
    SLOTS: 'SLOTS',
    FISHING: 'FISHING',
    CASINO: 'CASINO',
  },
};

const tableToModel: Record<string, string> = {
  administrators: 'administrator',
  default_affiliate_bonuses: 'defaultAffiliateBonus',
  vip_levels: 'vipLevel',
  rakeback_settings: 'rakebackSetting',
  level_promo_tiers: 'levelPromoTier',
  level_promo_bonuses: 'levelPromoBonus',
  chests: 'chest',
  deposit_promo_events: 'depositPromoEvent',
  deposit_promo_tiers: 'depositPromoTier',
  reedem_codes: 'reedemCode',
  banners: 'banner',
  sub_banners: 'subBanner',
  popup_banners: 'popupBanner',
  popup_icons: 'popupIcon',
  settings: 'setting',
  promotions: 'promotion',
  categories: 'category',
  games: 'game',
  prada_payments: 'pradaPayment',
  pp_clone_providers: 'pPCloneProvider',
  pg_clone_providers: 'pGCloneProvider',
  poker_providers: 'pokerProvider',
  users: 'user',
  vip_histories: 'vipHistory',
  vip_bonus_redemptions: 'vipBonusRedemption',
  affiliate_histories: 'affiliateHistory',
  chest_withdrawls: 'chestWithdrawal',
  deposits: 'deposit',
  withdrawals: 'withdrawal',
  level_promo_progresses: 'levelPromoProgress',
  deposit_promo_participations: 'depositPromoParticipation',
  game_transactions: 'gameTransaction',
  reedem_code_histories: 'reedemCodeHistory',
  rakeback_histories: 'rakebackHistory',
  rollover_requirements: 'rolloverRequirement',
  messages: 'mensage',
};

function convertValue(value: any, fieldName: string, modelName: string): any {
  if (value === null || value === undefined) {
    return value;
  }

  // Converter Date para formato MySQL seguro
  if (value instanceof Date) {
    return value;
  }

  // Converter enums
  if (
    modelName === 'Game' &&
    fieldName === 'game_type' &&
    value in enumMappings.GameType
  ) {
    return enumMappings.GameType[value as keyof typeof enumMappings.GameType];
  }

  // Converter BigDecimal (se vier de alguma fonte como objeto Decimal)
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    return value.toNumber();
  }

  return value;
}

// Sanitizar nomes de tabelas e colunas
function sanitizeTableName(name: string): string {
  return name.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
}

// Classe principal de migração
class DatabaseMigrator {
  private postgres: PgClient;
  private mysql: MysqlClient;
  private batchSize = 1000;
  private migratedCounts: Record<string, number> = {};

  constructor() {
    this.postgres = new PgClient({
      connectionString: process.env.DATABASE_URL_POSTGRES,
    });

    this.mysql = new MysqlClient();
  }

  async initialize() {
    console.log('🔧 Inicializando migração...');

    try {
      await this.postgres.connect();
      await this.mysql.$connect();

      console.log('✅ Conexões estabelecidas');
      return true;
    } catch (error) {
      console.error('❌ Erro ao conectar:', error);
      return false;
    }
  }

  async disconnect() {
    await this.postgres.end();
    await this.mysql.$disconnect();
    console.log('🔌 Conexões encerradas');
  }

  async getTableNames(): Promise<string[]> {
    // Ordem específica para evitar problemas de FK
    return [
      'administrators',
      'default_affiliate_bonuses',
      'vip_levels',
      'rakeback_settings',
      'level_promo_tiers',
      'level_promo_bonuses',
      'chests',
      'deposit_promo_events',
      'deposit_promo_tiers',
      'reedem_codes',
      'banners',
      'sub_banners',
      'popup_banners',
      'popup_icons',
      'settings',
      'promotions',
      'categories',
      'games',
      'prada_payments',
      'pp_clone_providers',
      'pg_clone_providers',
      'poker_providers',
      'users',
      'vip_histories',
      'vip_bonus_redemptions',
      'affiliate_histories',
      'chest_withdrawls',
      'deposits',
      'withdrawals',
      'level_promo_progresses',
      'deposit_promo_participations',
      'game_transactions',
      'reedem_code_histories',
      'rakeback_histories',
      'rollover_requirements',
      'messages',
    ];
  }

  async migrateTable(tableName: string): Promise<void> {
    console.log(`\n📦 Migrando tabela: ${tableName}`);

    let offset = 0;
    let totalMigrated = 0;

    try {
      // Verificar se tabela existe no MySQL
      const tableExists = await this.checkTableExists(tableName);

      if (!tableExists) {
        console.log(`⚠️  Tabela ${tableName} não existe no MySQL. Criando...`);
        // A tabela será criada pelo Prisma schema
      }

      const countResult = await this.postgres.query<{
        count: string;
      }>(`SELECT COUNT(*) AS count FROM ${tableName}`);
      const count = Number(countResult.rows[0]?.count ?? 0);
      console.log(`   Total de registros: ${count}`);

      // Migrar em batches
      while (true) {
        const recordsResult = await this.postgres.query(
          `SELECT * FROM ${tableName} ORDER BY id ASC OFFSET $1 LIMIT $2`,
          [offset, this.batchSize],
        );
        const records = recordsResult.rows;

        if (records.length === 0) {
          break;
        }

        // Preparar dados para MySQL
        const mysqlRecords = records.map((record) =>
          this.prepareRecordForMysql(record, tableName),
        );

        // Inserir no MySQL
        try {
          // @ts-ignore - Acesso dinâmico ao modelo
          await this.mysql[this.getModelName(tableName)].createMany({
            data: mysqlRecords,
            skipDuplicates: true,
          });

          totalMigrated += records.length;
          offset += this.batchSize;

          console.log(`   ✅ ${totalMigrated}/${count} migrados`);
        } catch (error: any) {
          console.error(`   ❌ Erro ao inserir batch:`, error.message);

          // Tentar inserir um por um para identificar problema
          await this.insertOneByOne(mysqlRecords, tableName);
          break;
        }
      }

      this.migratedCounts[tableName] = totalMigrated;
      console.log(`🎉 ${tableName}: ${totalMigrated} registros migrados`);
    } catch (error: any) {
      console.error(`❌ Erro ao migrar ${tableName}:`, error.message);
    }
  }

  private getModelName(tableName: string): string {
    const model = tableToModel[tableName];
    if (!model) {
      throw new Error(`Modelo Prisma não mapeado para tabela ${tableName}`);
    }
    return model;
  }

  private async checkTableExists(tableName: string): Promise<boolean> {
    try {
      // Verificar via query raw
      const result = await this.mysql.$queryRaw`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = ${tableName}
      `;
      return Array.isArray(result) && result[0].count > 0;
    } catch {
      return false;
    }
  }

  private prepareRecordForMysql(record: any, tableName: string): any {
    const prepared: any = {};

    for (const [key, value] of Object.entries(record)) {
      const convertedValue = convertValue(
        value,
        key,
        this.getModelName(tableName),
      );

      prepared[key] = convertedValue;
    }

    return prepared;
  }

  private async insertOneByOne(
    records: any[],
    tableName: string,
  ): Promise<void> {
    console.log(`   Tentando inserir um por um...`);

    for (const record of records) {
      try {
        // @ts-ignore - Acesso dinâmico ao modelo
        await this.mysql[this.getModelName(tableName)].create({
          data: record,
        });
      } catch (error: any) {
        console.error(`   ❌ Falha no registro:`, {
          id: record.id,
          error: error.message,
          record: JSON.stringify(record, null, 2).substring(0, 200),
        });
      }
    }
  }

  async migrateAll(): Promise<void> {
    const tables = await this.getTableNames();

    console.log('🚀 Iniciando migração completa');
    console.log(`📊 Total de tabelas: ${tables.length}`);

    for (const table of tables) {
      await this.migrateTable(table);
    }

    this.printSummary();
  }

  private printSummary(): void {
    console.log('\n' + '='.repeat(50));
    console.log('📈 RESUMO DA MIGRAÇÃO');
    console.log('='.repeat(50));

    let total = 0;
    for (const [table, count] of Object.entries(this.migratedCounts)) {
      console.log(
        `  ${table.padEnd(30)}: ${count.toString().padStart(6)} registros`,
      );
      total += count;
    }

    console.log('='.repeat(50));
    console.log(
      `  TOTAL${' '.padEnd(27)}: ${total.toString().padStart(6)} registros`,
    );
    console.log('='.repeat(50));
  }

  async verifyMigration(): Promise<void> {
    console.log('\n🔍 Verificando migração...');

    const tables = await this.getTableNames();

    for (const table of tables) {
      try {
        const postgresCountResult = await this.postgres.query<{
          count: string;
        }>(`SELECT COUNT(*) AS count FROM ${table}`);
        const postgresCount = Number(postgresCountResult.rows[0]?.count ?? 0);

        // @ts-ignore
        const mysqlCount = await this.mysql[this.getModelName(table)].count();

        console.log(
          `  ${table.padEnd(30)}: PostgreSQL: ${postgresCount.toString().padStart(6)} | ` +
            `MySQL: ${mysqlCount.toString().padStart(6)} | ` +
            `${postgresCount === mysqlCount ? '✅' : '❌'}`,
        );
      } catch (error) {
        console.log(`  ${table.padEnd(30)}: ⚠️  Erro na verificação`);
      }
    }
  }

  async migrateWithRelationships(): Promise<void> {
    console.log('\n🔄 Migrando com relacionamentos...');

    // 1. Migrar tabelas independentes primeiro
    const independentTables = [
      'administrators',
      'default_affiliate_bonuses',
      'vip_levels',
      'rakeback_settings',
      'level_promo_tiers',
      'level_promo_bonuses',
      'chests',
      'deposit_promo_events',
      'deposit_promo_tiers',
      'reedem_codes',
      'banners',
      'sub_banners',
      'popup_banners',
      'popup_icons',
      'settings',
      'promotions',
      'categories',
      'prada_payments',
      'pp_clone_providers',
      'pg_clone_providers',
      'poker_providers',
    ];

    for (const table of independentTables) {
      await this.migrateTable(table);
    }

    // 2. Migrar users (tem auto-relacionamento)
    await this.migrateTable('users');

    // 3. Migrar tabelas dependentes de users
    const dependentTables = [
      'vip_histories',
      'vip_bonus_redemptions',
      'affiliate_histories',
      'chest_withdrawls',
      'deposits',
      'withdrawals',
      'level_promo_progresses',
      'game_transactions',
      'reedem_code_histories',
      'rakeback_histories',
      'rollover_requirements',
      'messages',
    ];

    for (const table of dependentTables) {
      await this.migrateTable(table);
    }

    // 4. Migrar games (depende de categories)
    await this.migrateTable('games');

    // 5. Migrar participações (depende de users e deposits)
    await this.migrateTable('deposit_promo_participations');
  }
}

// Função principal
async function main() {
  console.log('🏁 INICIANDO MIGRAÇÃO POSTGRESQL → MYSQL');
  console.log('='.repeat(50));

  const migrator = new DatabaseMigrator();

  try {
    // Inicializar conexões
    const initialized = await migrator.initialize();
    if (!initialized) {
      process.exit(1);
    }

    // Opção 1: Migrar tudo de uma vez (recomendado para dados pequenos)
    // await migrator.migrateAll()

    // Opção 2: Migrar com ordem controlada (recomendado)
    await migrator.migrateWithRelationships();

    // Verificar migração
    await migrator.verifyMigration();

    console.log('\n🎉 Migração concluída com sucesso!');
  } catch (error) {
    console.error('💥 Erro durante a migração:', error);
    process.exit(1);
  } finally {
    await migrator.disconnect();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(console.error);
}

export { DatabaseMigrator };
