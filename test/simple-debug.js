const Keyv = require('keyv').default;
const PostgresStore = require('@keyv/postgres').default;

async function simpleDebug() {
  console.log('\n=== 简单调试测试 ===');
  
  const dbUrl = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache';
  
  // 方法1：直接使用URI
  console.log('\n1. 测试直接URI方法...');
  try {
    const keyv1 = new Keyv({
      uri: dbUrl,
      table: 'direct_uri_test',
      namespace: ''
    });
    
    await keyv1.set('test1', 'value1');
    const result1 = await keyv1.get('test1');
    console.log('   URI方法结果:', result1);
    
    // 检查数据库
    if (keyv1.opts?.store?.query) {
      const data = await keyv1.opts.store.query('SELECT * FROM direct_uri_test');
      console.log('   URI方法数据库记录数:', data.rows ? data.rows.length : 'N/A');
    }
    
  } catch (error) {
    console.error('   URI方法失败:', error.message);
  }
  
  // 方法2：明确使用PostgresStore
  console.log('\n2. 测试明确PostgresStore方法...');
  try {
    const store2 = new PostgresStore({
      uri: dbUrl,
      table: 'explicit_store_test',
      useUnloggedTable: false
    });
    
    const keyv2 = new Keyv({
      store: store2,
      namespace: ''
    });
    
    await keyv2.set('test2', 'value2');
    const result2 = await keyv2.get('test2');
    console.log('   PostgresStore方法结果:', result2);
    
    // 检查数据库
    if (store2.query) {
      const data = await store2.query('SELECT * FROM explicit_store_test');
      console.log('   PostgresStore方法数据库记录数:', data.rows ? data.rows.length : 'N/A');
    }
    
  } catch (error) {
    console.error('   PostgresStore方法失败:', error.message);
  }
  
  // 方法3：测试keyv_cache表
  console.log('\n3. 测试keyv_cache表...');
  try {
    const store3 = new PostgresStore({
      uri: dbUrl,
      table: 'keyv_cache',
      useUnloggedTable: false
    });
    
    const keyv3 = new Keyv({
      store: store3,
      namespace: ''
    });
    
    await keyv3.set('test3', 'value3');
    const result3 = await keyv3.get('test3');
    console.log('   keyv_cache方法结果:', result3);
    
    // 检查数据库
    if (store3.query) {
      const data = await store3.query('SELECT * FROM keyv_cache');
      console.log('   keyv_cache数据库记录数:', data.rows ? data.rows.length : 'N/A');
      if (data && data.rows) {
        data.rows.forEach((row, index) => {
          console.log(`     ${index + 1}. Key="${row.key}", Value="${row.value}"`);
        });
      }
    }
    
  } catch (error) {
    console.error('   keyv_cache方法失败:', error.message);
  }
  
  console.log('\n=== 简单调试完成 ===');
}

simpleDebug().catch(console.error);