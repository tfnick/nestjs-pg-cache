const { Test } = require('@nestjs/testing');
const { PgCacheModule, PgCacheService } = require('../dist');

async function debugStorage() {
  console.log('=== 调试存储问题 ===');
  
  let module;
  let service;
  
  try {
    module = await Test.createTestingModule({
      imports: [
        PgCacheModule.forRoot({
          cache: {
            uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
            table: 'debug_storage_cache',
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

    // 测试基本的 get/set
    console.log('\n=== 测试基础存储 ===');
    const testKey = 'debug:basic:test';
    const testValue = 'Hello Debug!';
    
    console.log('设置值:', testKey, '=', testValue);
    const setResult = await service.set(testKey, testValue);
    console.log('设置结果:', setResult);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('获取值:', testKey);
    const getResult = await service.get(testKey);
    console.log('获取结果:', getResult);
    console.log('获取结果类型:', typeof getResult);
    
    // 检查底层 Keyv 客户端
    console.log('\n=== 检查底层 Keyv 客户端 ===');
    const client = service.getClient();
    console.log('客户端类型:', typeof client);
    console.log('客户端选项:', client.opts ? '存在' : '不存在');
    
    if (client.opts) {
      console.log('存储配置:', client.opts.store ? '存在' : '不存在');
      console.log('命名空间:', client.opts.namespace);
    }
    
    // 直接使用底层客户端测试
    console.log('\n=== 直接使用底层客户端测试 ===');
    const directKey = 'debug:direct:test';
    const directValue = 'Direct Hello!';
    
    console.log('直接设置值:', directKey, '=', directValue);
    const directSetResult = await client.set(directKey, directValue);
    console.log('直接设置结果:', directSetResult);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('直接获取值:', directKey);
    const directGetResult = await client.get(directKey);
    console.log('直接获取结果:', directGetResult);
    console.log('直接获取结果类型:', typeof directGetResult);
    
    // 检查数据库中的实际存储
    console.log('\n=== 检查数据库存储 ===');
    const store = client.opts.store;
    if (store && typeof store.query === 'function') {
      try {
        const rows = await store.query('SELECT key, value FROM keyv_cache WHERE key LIKE $1', ['%debug%']);
        console.log('数据库中的记录:');
        rows.forEach(row => {
          console.log(`  键: ${row.key}, 值: ${row.value}`);
        });
      } catch (error) {
        console.error('查询数据库失败:', error);
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

debugStorage();