const Keyv = require('keyv').default;
const PostgresStore = require('@keyv/postgres').default;

async function minimalKeyvTest() {
  console.log('
=== 最小化Keyv测试 ===');
  
  const dbUrl = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache';
  const tableName = 'minimal_keyv_test';
  
  try {
    // 清理表
    console.log('1. 清理测试表...');
    const cleanupStore = new PostgresStore({
      uri: dbUrl,
      table: tableName,
      useUnloggedTable: false
    });
    
    if (cleanupStore.query) {
      await cleanupStore.query(`DELETE FROM ${tableName}`);
      await cleanupStore.query(`DROP TABLE IF EXISTS ${tableName}`);
      console.log('   ✅ 表清理完成');
    }
    
    // 测试1：使用URI方式
    console.log('
2. 测试URI方式...');
    const keyv1 = new Keyv({
      uri: dbUrl,
      table: tableName,
      namespace: '',
      ttl: 60000
    });
    
    await keyv1.set('test:uri:key', 'uri_value');
    console.log('   设置完成');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const uriResult = await keyv1.get('test:uri:key');
    console.log(`   URI获取结果: ${uriResult}`);
    
    // 测试2：使用Store方式
    console.log('
3. 测试Store方式...');
    const store2 = new PostgresStore({
      uri: dbUrl,
      table: tableName,
      useUnloggedTable: false
    });
    
    const keyv2 = new Keyv({
      store: store2,
      namespace: '',
      ttl: 60000
    });
    
    await keyv2.set('test:store:key', 'store_value');
    console.log('   设置完成');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const storeResult = await keyv2.get('test:store:key');
    console.log(`   Store获取结果: ${storeResult}`);
    
    // 验证数据库
    console.log('\n4. 验证数据库...');
    if (cleanupStore.query) {
      const data = await cleanupStore.query(`SELECT key, value FROM ${tableName}`);
      console.log(`   数据库记录数: ${data.rows.length}`);
      
      data.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. Key="${row.key}", Value="${row.value}"`);
      });
    }
    
    console.log('
✅ 最小化Keyv测试完成');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('详细错误:', error);
  }
}

minimalKeyvTest();