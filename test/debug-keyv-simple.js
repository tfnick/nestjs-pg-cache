const { Test } = require('@nestjs/testing');
const { PgCacheModule, PgCacheService } = require('../dist');

async function debugKeyvSimple() {
  console.log('=== 简化调试 Keyv ===');
  
  let module;
  let service;
  
  try {
    module = await Test.createTestingModule({
      imports: [
        PgCacheModule.forRoot({
          cache: {
            uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
            table: 'debug_simple_cache',
            namespace: '',
            useUnloggedTable: false,
            ttl: 60000
          }
        })
      ]
    }).compile();

    service = module.get(PgCacheService);
    console.log('服务初始化完成');

    await new Promise(resolve => setTimeout(resolve, 3000));

    const client = service.getClient();
    const store = client.opts.store;
    
    // 清空表
    await store.query('DELETE FROM debug_simple_cache');
    
    console.log('\n=== 检查 Keyv 内部存储格式 ===');
    const testKey = 'simple:test:key';
    const testValue = { data: 'simple test' };
    
    console.log('原始键:', testKey);
    console.log('原始值:', testValue);
    
    // 直接使用 Keyv 存储
    await client.set(testKey, testValue);
    
    // 检查实际存储
    const rows = await store.query('SELECT key, value FROM debug_simple_cache');
    console.log('数据库中的实际存储:');
    rows.forEach(row => {
      console.log(`  键: "${row.key}"`);
      console.log(`  值: "${row.value}"`);
      try {
        const parsed = JSON.parse(row.value);
        console.log(`  解析后:`, parsed);
      } catch (e) {
        console.log(`  解析失败: ${e.message}`);
      }
    });
    
    // 尝试不同的方式获取
    console.log('\n=== 测试不同的获取方式 ===');
    
    // 方式1: 直接获取原始键
    const get1 = await client.get(testKey);
    console.log('1. 原始键获取:', get1);
    
    // 方式2: 使用数据库直接查询
    const dbQuery = await store.query('SELECT value FROM debug_simple_cache WHERE key = $1', [testKey]);
    console.log('2. 数据库查询:', dbQuery);
    
    if (dbQuery.length > 0) {
      const dbValue = dbQuery[0].value;
      try {
        const parsed = JSON.parse(dbValue);
        console.log('3. 解析后的数据:', parsed);
        console.log('4. 提取的 value:', parsed.value);
      } catch (e) {
        console.log('解析失败:', e.message);
      }
    }
    
    await service.reset();
    await module.close();
    
  } catch (error) {
    console.error('调试失败:', error);
    if (module) {
      await module.close();
    }
  }
}

debugKeyvSimple();