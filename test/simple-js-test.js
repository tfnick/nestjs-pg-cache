const { Test } = require('@nestjs/testing');
const { PgCacheModule, PgCacheService } = require('../dist');

async function runSimpleTest() {
  console.log('=== 开始简单测试 ===');
  
  let module;
  try {
    module = await Test.createTestingModule({
      imports: [
        PgCacheModule.forRoot({
          cache: {
            uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
            table: 'simple_js_test_cache',
            namespace: '',
            useUnloggedTable: false,
            ttl: 60000
          }
        })
      ]
    }).compile();

    const service = module.get(PgCacheService);
    console.log('服务初始化成功');

    // 等待连接建立
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 测试字符串设置和获取
    const key = 'js:test:' + Date.now();
    const value = 'Hello from JavaScript!';

    console.log('测试设置键:', key, '值:', value);
    const setResult = await service.set(key, value);
    console.log('设置结果:', setResult);

    await new Promise(resolve => setTimeout(resolve, 1000));

    const getResult = await service.get(key);
    console.log('获取结果:', getResult);
    console.log('获取结果类型:', typeof getResult);

    if (getResult === value) {
      console.log('✓ 字符串测试通过');
    } else {
      console.log('✗ 字符串测试失败');
    }

    // 清理
    await service.reset();
    await module.close();
    
    console.log('=== 测试完成 ===');
  } catch (error) {
    console.error('测试失败:', error);
    if (module) {
      await module.close();
    }
  }
}

runSimpleTest();