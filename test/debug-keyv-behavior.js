const { Test } = require('@nestjs/testing');
const { PgCacheModule, PgCacheService } = require('../dist');

async function debugKeyvBehavior() {
  console.log('=== 调试 Keyv 行为 ===');
  
  let module;
  let service;
  
  try {
    module = await Test.createTestingModule({
      imports: [
        PgCacheModule.forRoot({
          cache: {
            uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
            table: 'keyv_behavior_cache',
            namespace: '',
            useUnloggedTable: false,
            ttl: 60000
          }
        })
      ]
    }).compile();

    service = module.get(PgCacheService);
    console.log('服务初始化完成');

    // 等待连接建立
    await new Promise(resolve => setTimeout(resolve, 3000));

    const client = service.getClient();
    const store = client.opts.store;
    
    // 清空表
    try {
      await store.query('DELETE FROM keyv_behavior_cache');
    } catch (error) {
      console.log('清空表失败，可能表不存在:', error.message);
    }
    
    // 测试 Keyv 的键命名行为
    console.log('\n=== 测试 Keyv 键命名 ===');
    const testKey = 'user:test:123';
    const testValue = { id: 123, name: 'Test User' };
    
    console.log('设置键:', testKey);
    console.log('设置值:', testValue);
    
    // 使用 client 直接设置
    const setResult = await client.set(testKey, testValue);
    console.log('设置结果:', setResult);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 检查数据库中的实际键
    console.log('\n=== 检查数据库中的实际键 ===');
    const rows = await store.query('SELECT key, value FROM keyv_behavior_cache');
    console.log('数据库中的所有记录:');
    rows.forEach(row => {
      console.log(`  原始键: "${row.key}"`);
      console.log(`  原始值: "${row.value}"`);
      console.log(`  值类型: ${typeof row.value}`);
    });
    
    // 尝试用不同的键获取
    console.log('\n=== 尝试不同的键获取 ===');
    const possibleKeys = [
      testKey,
      `keyv:${testKey}`,
      `keyv::${testKey}`,
      `keyv:${testKey}:`,
    ];
    
    for (const keyToTry of possibleKeys) {
      console.log(`尝试获取键: "${keyToTry}"`);
      const result = await client.get(keyToTry);
      console.log(`  结果:`, result);
      console.log(`  类型:`, typeof result);
    }
    
    // 直接查询数据库验证
    console.log('\n=== 直接查询验证 ===');
    const allKeys = await store.query('SELECT key FROM keyv_behavior_cache');
    console.log('所有数据库键:', allKeys.map(r => r.key));
    
    await service.reset();
    await module.close();
    
  } catch (error) {
    console.error('调试失败:', error);
    if (module) {
      await module.close();
    }
  }
}

debugKeyvBehavior();