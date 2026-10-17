import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('⚡ [TimescaleDB] Checking & configuring TimescaleDB hypertable for LocationRecord...');

  try {
    // 1. Enable TimescaleDB Extension if available
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;`);
    console.log('✅ [TimescaleDB] Extension "timescaledb" enabled / already present.');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('⚠️ [TimescaleDB] Extension notice:', msg);
  }

  try {
    // 2. Convert LocationRecord into a hypertable partitioned by timestamp
    await prisma.$executeRawUnsafe(`
      SELECT create_hypertable('"LocationRecord"', 'timestamp', if_not_exists => TRUE, migrate_data => TRUE);
    `);
    console.log('✅ [TimescaleDB] "LocationRecord" hypertable verified / initialized.');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('⚠️ [TimescaleDB] create_hypertable notice:', msg);
  }

  try {
    // 3. Verify hypertable status
    const result = await prisma.$queryRawUnsafe<Array<{ hypertable_name: string; num_chunks: number }>>(`
      SELECT hypertable_name, num_chunks 
      FROM timescaledb_information.hypertables 
      WHERE hypertable_name = 'LocationRecord';
    `);
    if (result && result.length > 0) {
      console.log(`🚀 [TimescaleDB] Active hypertable: LocationRecord (Current chunks: ${result[0].num_chunks})`);
    }
  } catch {
    // TimescaleDB information view might not be queried if running on vanilla postgres fallback
  }
}

main()
  .catch((err) => {
    console.error('❌ [TimescaleDB] Setup error:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
