const { Test } = require('@nestjs/testing');
const { PgCacheModule, PgCacheService } = require('../dist');

async function quickTest() {
  console.log('=== 快速测试修复 ===');
  
  let module;
  let service;
  
  try {
    module = await Test.createTestingModule({
      imports: [
        PgCacheModule.forRoot({
          cache: {
            uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
            table: 'quick_fix_cache',
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

    // 测试基础 set/get
    console.log('\n=== 测试基础 set/get ===');
    const key = 'quick:test';
    const value = 'Quick Test Value';
    
    console.log('设置:', key, '=', value);
    const setResult = await service.set(key, value);
    console.log('设置结果:', setResult);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('获取:', key);
    const getResult = await service.get(key);
    console.log('获取结果:', getResult);
    
    const success = getResult === value;
    console.log('基础测试', success ? '✅ 通过' : '❌ 失败');
    
    // 测试对象
    console.log('\n=== 测试对象 set/get ===');
    const objKey = 'quick:object:test';
    const objValue = { id: 123, name: 'Object Test' };
    
    console.log('设置对象:', objKey, '=', objValue);
    const setObjResult = await service.set(objKey, objValue);
    console.log('设置对象结果:', setObjResult);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('获取对象:', objKey);
    const getObjResult = await service.get(objKey);
    console.log('获取对象结果:', getObjResult);
    
    const objSuccess = JSON.stringify(getObjResult) === JSON.stringify(objValue);
    console.log('对象测试', objSuccess ? '✅ 通过' : '❌ 失败');
    
    await service.reset();
    await module.close();
    
    console.log('\n=== 总结 ===');
    console.log('基础测试:', success ? '通过' : '失败');
    console.log('对象测试:', objSuccess ? '通过' : '失败');
    
  } catch (error) {
    console.error('快速测试失败:', error);
    if (module) {
      await module.close();
    }
  }
}

quickTest();