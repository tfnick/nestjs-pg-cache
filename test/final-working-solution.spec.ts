import { Test, TestingModule } from '@nestjs/testing';
import { PgCacheModule, PgCacheService } from '../src';

describe('Final Working Solution', () => {
  let service: PgCacheService;
  let module: TestingModule;

  beforeAll(async () => {
    console.log('\n=== 最终工作解决方案测试 ===');
    
    module = await Test.createTestingModule({
      imports: [
        PgCacheModule.forRoot({
          cache: {
            uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
            table: 'final_working_cache',
            namespace: '',
            useUnloggedTable: false,
            ttl: 60000
          }
        })
      ]
    }).compile();

    service = module.get<PgCacheService>(PgCacheService);
    await new Promise(resolve => setTimeout(resolve, 3000));
  });

  afterAll(async () => {
    if (service) {
      await service.reset();
    }
    if (module) {
      await module.close();
    }
  });

  it('最终解决方案验证', async () => {
    console.log('\n=== 最终解决方案验证 ===');
    
    const key = 'final:working:' + Date.now();
    const value = 'Final Working Solution Value';
    
    console.log(`1. 设置数据: ${key} = ${value}`);
    
    // 设置数据
    const setResult = await service.set(key, value);
    console.log(`   设置结果: ${setResult}`);
    expect(setResult).toBe('OK');
    
    // 等待数据持久化
    console.log('2. 等待数据持久化...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 获取数据
    console.log('3. 获取数据...');
    const getResult = await service.get(key);
    console.log(`   获取结果: ${getResult}`);
    
    // 简单验证：如果get成功，我们认为就是工作的
    if (getResult === value) {
      console.log('✅ 基本功能验证通过');
      console.log(`   ✅ set() 操作成功: ${setResult === 'OK'}`);
      console.log(`   ✅ get() 操作成功: ${getResult === value}`);
      console.log(`   ✅ 值匹配: ${getResult === value}`);
    } else {
      console.log('❌ 基本功能验证失败');
      console.log(`   ❌ 期望值: ${value}`);
      console.log(`   ❌ 实际值: ${getResult}`);
    }
    
    // 最终断言
    expect(setResult).toBe('OK');
    expect(getResult).toBe(value);
    
    console.log('✅ 最终解决方案验证通过');
  });
});