const { Test } = require('@nestjs/testing');
const { PgCacheModule, PgCacheService } = require('../dist');
const Keyv = require('keyv').default || require('keyv');
const PostgresStore = require('@keyv/postgres').default || require('@keyv/postgres');

async function serviceConfigTest() {
  console.log('=== 测试服务配置 ===');
  
  let keyvWithServiceConfig;
  
  try {
    console.log('\n=== 使用服务配置创建 Keyv ===');
    
    // 完全复制我们服务的配置
    const postgresStore = new PostgresStore({
      uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
      table: 'service_config_test',
      useUnloggedTable: false
    });

    const keyvOptions = {
      store: postgresStore,
      ttl: 60000,
      compression: undefined,
      serialize: undefined, // 这可能是问题
      deserialize: undefined, // 这可能是问题
      namespace: ''
    };

    keyvWithServiceConfig = new Keyv(keyvOptions);
    
    // 等待连接
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Keyv 配置完成');
    
    // 清空表
    try {
      await keyvWithServiceConfig.clear();
      console.log('表已清空');
    } catch (error) {
      console.log('清空失败:', error.message);
    }
    
    console.log('\n=== 测试服务配置下的 set/get ===');
    const testKey = 'service:config:test';
    const testValue = { data: 'service config test', timestamp: Date.now() };
    
    console.log('设置:', testKey, '=', testValue);
    const setResult = await keyvWithServiceConfig.set(testKey, testValue);
    console.log('设置结果:', setResult);
    
    // 检查数据库实际存储
    if (typeof postgresStore.query === 'function') {
      try {
        const rows = await postgresStore.query('SELECT key, value FROM service_config_test');
        console.log('数据库中的实际存储:');
        rows.forEach(row => {
          console.log(`  键: "${row.key}"`);
          console.log(`  值: "${row.value}"`);
          try {
            const parsed = JSON.parse(row.value);
            console.log(`  解析:`, parsed);
          } catch (e) {
            console.log(`  解析失败: ${e.message}`);
          }
        });
      } catch (dbError) {
        console.error('查询数据库失败:', dbError);
      }
    }
    
    console.log('\n=== 等待后获取 ===');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('获取:', testKey);
    const getResult = await keyvWithServiceConfig.get(testKey);
    console.log('获取结果:', getResult);
    console.log('获取结果类型:', typeof getResult);
    
    const success = JSON.stringify(getResult) === JSON.stringify(testValue);
    console.log('服务配置测试', success ? '✅ 通过' : '❌ 失败');
    
    console.log('\n=== 测试无序列化配置 ===');
    
    // 现在测试不传递序列化选项
    const keyvWithoutSerialization = new Keyv({
      store: postgresStore,
      ttl: 60000,
      namespace: ''
    });
    
    const testKey2 = 'no:serialization:test';
    const testValue2 = { data: 'no serialization test', timestamp: Date.now() };
    
    console.log('设置(无序列化):', testKey2, '=', testValue2);
    const setResult2 = await keyvWithoutSerialization.set(testKey2, testValue2);
    console.log('设置结果:', setResult2);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('获取(无序列化):', testKey2);
    const getResult2 = await keyvWithoutSerialization.get(testKey2);
    console.log('获取结果:', getResult2);
    
    const success2 = JSON.stringify(getResult2) === JSON.stringify(testValue2);
    console.log('无序列化配置测试', success2 ? '✅ 通过' : '❌ 失败');
    
    if (keyvWithServiceConfig) {
      await keyvWithServiceConfig.clear();
    }
    
  } catch (error) {
    console.error('服务配置测试失败:', error);
    console.error('错误详情:', error.stack);
    if (keyvWithServiceConfig) {
      await keyvWithServiceConfig.clear();
    }
  }
}

serviceConfigTest();