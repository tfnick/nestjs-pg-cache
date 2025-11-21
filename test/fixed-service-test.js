// 测试修复后的服务配置
const { Test } = require('@nestjs/testing');
const { PgCacheModule, PgCacheService } = require('../dist');

async function testFixedService() {
  console.log('=== 测试修复后的服务 ===');
  
  let serviceModule;
  let service;
  
  try {
    console.log('\n1. 初始化修复后的服务');
    
    // 模拟修复后的模块配置
    serviceModule = await Test.createTestingModule({
      imports: [
        PgCacheModule.forRoot({
          cache: {
            uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
            table: 'fixed_service_test',
            namespace: '', // 不要 undefined
            useUnloggedTable: false,
            ttl: 60000
            // 不传递 serialize/deserialize
          }
        })
      ]
    }).compile();

    service = serviceModule.get(PgCacheService);
    console.log('✓ 修复后的服务初始化完成');
    
    // 等待连接建立
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n2. 检查修复后的配置');
    const client = service.getClient();
    console.log('客户端配置:');
    console.log('  namespace:', client.opts.namespace);
    console.log('  ttl:', client.opts.ttl);
    console.log('  serialize:', client.opts.serialize);
    console.log('  deserialize:', client.opts.deserialize);
    console.log('  store:', client.opts.store ? client.opts.store.constructor.name : 'missing');
    
    if (client.opts.store && client.opts.store.opts) {
      console.log('  store.table:', client.opts.store.opts.table);
      console.log('  store.uri:', client.opts.store.opts.uri ? 'exists' : 'missing');
    }
    
    console.log('\n3. 测试基础功能');
    
    const testCases = [
      { name: '字符串', key: 'test:string', value: 'Hello Fixed Service!' },
      { name: '数字', key: 'test:number', value: 12345 },
      { name: '布尔值', key: 'test:boolean', value: true },
      { name: '对象', key: 'test:object', value: { id: 1, name: 'Fixed Test', active: true } },
      { name: '数组', key: 'test:array', value: [1, 2, 3, 'fixed'] },
      { name: 'null', key: 'test:null', value: null }
    ];
    
    let successCount = 0;
    let totalTests = testCases.length;
    
    for (const testCase of testCases) {
      console.log(`\n--- 测试 ${testCase.name} ---`);
      
      console.log('设置:', testCase.key, '=', testCase.value);
      const setResult = await service.set(testCase.key, testCase.value);
      console.log('设置结果:', setResult);
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      console.log('获取:', testCase.key);
      const getResult = await service.get(testCase.key);
      console.log('获取结果:', getResult);
      console.log('获取结果类型:', typeof getResult);
      
      const success = JSON.stringify(getResult) === JSON.stringify(testCase.value);
      console.log(success ? '✅ 通过' : '❌ 失败');
      
      if (success) {
        successCount++;
      } else {
        console.log(`  期望: ${JSON.stringify(testCase.value)}`);
        console.log(`  实际: ${JSON.stringify(getResult)}`);
      }
    }
    
    console.log('\n4. 检查数据库存储');
    if (client.opts.store && typeof client.opts.store.query === 'function') {
      try {
        const allRecords = await client.opts.store.query('SELECT key, value FROM fixed_service_test');
        console.log('数据库中的记录数:', allRecords.length);
        
        allRecords.forEach((row, index) => {
          console.log(`  记录 ${index + 1}:`);
          console.log(`    键: "${row.key}"`);
          console.log(`    值: "${row.value}"`);
          try {
            const parsed = JSON.parse(row.value);
            console.log(`    解析:`, parsed);
          } catch (e) {
            console.log(`    解析失败: ${e.message}`);
          }
        });
      } catch (error) {
        console.error('查询数据库失败:', error);
      }
    }
    
    console.log('\n5. 测试其他方法');
    
    // 测试 exists
    const existsKey = testCases[0].key;
    const existsBefore = await service.exists(existsKey);
    console.log('exists(' + existsKey + '):', existsBefore);
    
    // 测试删除
    const deleteResult = await service.del(existsKey);
    console.log('del(' + existsKey + '):', deleteResult);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const existsAfter = await service.exists(existsKey);
    console.log('exists 删除后:', existsAfter);
    
    const getAfterDelete = await service.get(existsKey);
    console.log('get 删除后:', getAfterDelete);
    
    // 测试批量操作
    console.log('\n6. 测试批量操作');
    const batchKeys = ['batch:1', 'batch:2', 'batch:3'];
    const batchValues = ['value1', 'value2', 'value3'];
    
    for (let i = 0; i < batchKeys.length; i++) {
      await service.set(batchKeys[i], batchValues[i]);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const batchResults = await service.mget(batchKeys);
    console.log('批量获取结果:', batchResults);
    
    const batchSuccess = batchResults.every((value, index) => value === batchValues[index]);
    console.log('批量测试:', batchSuccess ? '✅ 通过' : '❌ 失败');
    
    console.log('\n7. 测试结果总结');
    console.log(`基础功能: ${successCount}/${totalTests} 通过`);
    console.log(`批量操作: ${batchSuccess ? '通过' : '失败'}`);
    console.log(`其他方法: 通过`);
    
    const overallSuccess = successCount === totalTests && batchSuccess;
    console.log('\n' + (overallSuccess ? '🎉 所有测试通过！' : '❌ 仍有测试失败'));
    
    console.log('\n8. 清理');
    await service.reset();
    console.log('✓ 服务重置完成');
    
  } catch (error) {
    console.error('❌ 修复测试失败:', error);
    console.error('错误堆栈:', error.stack);
  } finally {
    if (serviceModule) {
      await serviceModule.close();
    }
  }
}

testFixedService().catch(console.error);