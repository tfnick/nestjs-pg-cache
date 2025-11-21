// 对比我们服务和原生 Keyv 的行为
const { Test } = require('@nestjs/testing');
const { PgCacheModule, PgCacheService } = require('../dist');
const keyvModule = require('keyv');
const Keyv = keyvModule.Keyv || keyvModule.default || keyvModule;
const postgresModule = require('@keyv/postgres');
const PostgresStore = postgresModule.default || postgresModule.PostgresStore || postgresModule;

async function compareServiceVsNative() {
  console.log('=== 服务 vs 原生 Keyv 对比测试 ===');
  
  let serviceModule;
  let service;
  let nativeKeyv;
  
  try {
    // 1. 初始化我们的服务
    console.log('\n1. 初始化 PgCacheService');
    serviceModule = await Test.createTestingModule({
      imports: [
        PgCacheModule.forRoot({
          cache: {
            uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
            table: 'compare_service_test',
            namespace: '',
            useUnloggedTable: false,
            ttl: 60000
          }
        })
      ]
    }).compile();

    service = serviceModule.get(PgCacheService);
    console.log('✓ PgCacheService 初始化完成');
    
    // 2. 初始化原生 Keyv（使用相同配置）
    console.log('\n2. 初始化原生 Keyv');
    nativeKeyv = new Keyv({
      store: new PostgresStore({
        uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
        table: 'compare_native_test',
        useUnloggedTable: false
      }),
      namespace: ''
    });
    console.log('✓ 原生 Keyv 初始化完成');
    
    // 等待连接建立
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n3. 对比测试');
    
    // 测试数据
    const testCases = [
      { key: 'test:string', value: 'Hello World!' },
      { key: 'test:number', value: 12345 },
      { key: 'test:boolean', value: true },
      { key: 'test:object', value: { id: 1, name: 'Test', active: true } },
      { key: 'test:array', value: [1, 2, 3, 'test'] },
      { key: 'test:null', value: null },
      { key: 'test:undefined', value: undefined }
    ];
    
    let serviceSuccess = 0;
    let nativeSuccess = 0;
    
    for (const testCase of testCases) {
      const serviceResult = await testSetGet(service, `service:${testCase.key}`, testCase.value);
      const nativeResult = await testSetGet(nativeKeyv, `native:${testCase.key}`, testCase.value);
      
      if (serviceResult) serviceSuccess++;
      if (nativeResult) nativeSuccess++;
      
      console.log(`\n--- ${testCase.key} ---`);
      console.log(`PgCacheService: ${serviceResult ? '✅' : '❌'}`);
      console.log(`原生 Keyv:      ${nativeResult ? '✅' : '❌'}`);
      
      if (serviceResult !== nativeResult) {
        console.log(`⚠️  行为不一致！`);
      }
    }
    
    console.log('\n4. 测试结果统计');
    console.log(`PgCacheService: ${serviceSuccess}/${testCases.length} 测试通过`);
    console.log(`原生 Keyv:      ${nativeSuccess}/${testCases.length} 测试通过`);
    
    console.log('\n5. 深度调试');
    
    // 找一个失败的案例进行深度调试
    if (serviceSuccess < testCases.length) {
      console.log('\n--- 深度调试失败的案例 ---');
      const debugKey = 'debug:test:object';
      const debugValue = { debug: true, data: '深度调试', timestamp: Date.now() };
      
      console.log('测试键:', debugKey);
      console.log('测试值:', debugValue);
      
      // 使用服务测试
      console.log('\n5.1 使用 PgCacheService:');
      console.log('设置...');
      const serviceSet = await service.set(debugKey, debugValue);
      console.log('设置结果:', serviceSet);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('获取...');
      const serviceGet = await service.get(debugKey);
      console.log('获取结果:', serviceGet);
      console.log('获取结果类型:', typeof serviceGet);
      
      // 获取底层 Keyv 客户端
      const serviceClient = service.getClient();
      console.log('服务底层 Keyv 配置:', {
        namespace: serviceClient.opts.namespace,
        store: serviceClient.opts.store ? 'exists' : 'missing',
        ttl: serviceClient.opts.ttl,
        serialize: serviceClient.opts.serialize,
        deserialize: serviceClient.opts.deserialize
      });
      
      // 使用原生 Keyv 测试
      console.log('\n5.2 使用原生 Keyv:');
      console.log('设置...');
      const nativeSet = await nativeKeyv.set(debugKey, debugValue);
      console.log('设置结果:', nativeSet);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('获取...');
      const nativeGet = await nativeKeyv.get(debugKey);
      console.log('获取结果:', nativeGet);
      console.log('获取结果类型:', typeof nativeGet);
      
      // 检查数据库实际存储
      console.log('\n5.3 检查数据库存储:');
      
      // 检查服务表
      const serviceStore = serviceClient.opts.store;
      if (serviceStore && typeof serviceStore.query === 'function') {
        try {
          const serviceRows = await serviceStore.query('SELECT key, value FROM compare_service_test WHERE key LIKE $1', [`%${debugKey}%`]);
          console.log('服务表存储:');
          serviceRows.forEach(row => {
            console.log(`  键: "${row.key}"`);
            console.log(`  值: "${row.value}"`);
            try {
              const parsed = JSON.parse(row.value);
              console.log(`  解析:`, parsed);
            } catch (e) {
              console.log(`  解析失败: ${e.message}`);
            }
          });
        } catch (error) {
          console.error('查询服务表失败:', error);
        }
      }
      
      // 检查原生表
      const nativeStore = nativeKeyv.opts.store;
      if (nativeStore && typeof nativeStore.query === 'function') {
        try {
          const nativeRows = await nativeStore.query('SELECT key, value FROM compare_native_test WHERE key LIKE $1', [`%${debugKey}%`]);
          console.log('原生表存储:');
          nativeRows.forEach(row => {
            console.log(`  键: "${row.key}"`);
            console.log(`  值: "${row.value}"`);
            try {
              const parsed = JSON.parse(row.value);
              console.log(`  解析:`, parsed);
            } catch (e) {
              console.log(`  解析失败: ${e.message}`);
            }
          });
        } catch (error) {
          console.error('查询原生表失败:', error);
        }
      }
    }
    
    console.log('\n6. 清理');
    if (service) {
      await service.reset();
    }
    if (nativeKeyv) {
      await nativeKeyv.clear();
    }
    if (serviceModule) {
      await serviceModule.close();
    }
    console.log('✓ 清理完成');
    
  } catch (error) {
    console.error('❌ 对比测试失败:', error);
    console.error('错误堆栈:', error.stack);
    
    if (service) {
      await service.reset();
    }
    if (nativeKeyv) {
      await nativeKeyv.clear();
    }
    if (serviceModule) {
      await serviceModule.close();
    }
  }
}

async function testSetGet(cacheInstance, key, value) {
  try {
    await cacheInstance.set(key, value);
    await new Promise(resolve => setTimeout(resolve, 500));
    const retrieved = await cacheInstance.get(key);
    
    if (retrieved === undefined && value === undefined) {
      return true;
    }
    if (retrieved === null && value === null) {
      return true;
    }
    
    return JSON.stringify(retrieved) === JSON.stringify(value);
  } catch (error) {
    console.error(`测试 ${key} 失败:`, error.message);
    return false;
  }
}

// 运行对比测试
compareServiceVsNative().catch(console.error);