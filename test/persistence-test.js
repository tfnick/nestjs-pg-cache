const { Client } = require('pg');

async function checkPersistence() {
  const client = new Client({
    connectionString: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache'
  });

  try {
    await client.connect();
    
    console.log('检查 keyv_cache 表是否存在...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'keyv_cache'
      );
    `);
    console.log('表存在:', tableCheck.rows[0].exists);
    
    if (tableCheck.rows[0].exists) {
      // 先检查表结构
      console.log('检查表结构...');
      const schema = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'keyv_cache'
        ORDER BY ordinal_position
      `);
      console.log('表结构:');
      schema.rows.forEach(col => console.log(`  ${col.column_name}: ${col.data_type}`));
      
      console.log('检查表中的数据...');
      const count = await client.query('SELECT COUNT(*) as count FROM keyv_cache');
      console.log('总记录数:', count.rows[0].count);
      
      // 根据实际的列名查询数据
      let dataQuery;
      if (schema.rows.some(col => col.column_name === 'created_at')) {
        dataQuery = 'SELECT key, value FROM keyv_cache ORDER BY created_at DESC LIMIT 10';
      } else {
        dataQuery = 'SELECT key, value FROM keyv_cache LIMIT 10';
      }
      
      const data = await client.query(dataQuery);
      console.log('最近的记录:');
      data.rows.forEach((row, index) => {
        console.log(`${index + 1}. Key: ${row.key}, Value: ${row.value}`);
      });
    }
    
  } catch (error) {
    console.error('数据库查询错误:', error);
  } finally {
    await client.end();
  }
}

checkPersistence();