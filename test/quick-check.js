const { Client } = require('pg');

async function quickCheck() {
  const client = new Client({
    connectionString: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache'
  });

  try {
    await client.connect();
    
    // 检查所有表
    console.log('检查所有表...');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('所有表:');
    tables.rows.forEach(row => console.log(`  - ${row.table_name}`));
    
    // 检查每个表的数据
    for (const table of tables.rows) {
      const count = await client.query(`SELECT COUNT(*) as count FROM ${table.table_name}`);
      console.log(`  ${table.table_name}: ${count.rows[0].count} 条记录`);
    }
    
  } catch (error) {
    console.error('错误:', error);
  } finally {
    await client.end();
  }
}

quickCheck();