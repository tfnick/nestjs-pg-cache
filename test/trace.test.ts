import { Test, TestingModule } from '@nestjs/testing';
import { PgCacheModule, PgCacheService } from '../src';

describe('Trace Test', () => {
  let service: PgCacheService;
  let module: TestingModule;

  beforeAll(async () => {
    console.log('=== 开始初始化 ===');
    module = await Test.createTestingModule({
      imports: [
        PgCacheModule.forRoot({
          cache: {
            uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
            table: 'trace_test_cache'
          }
        })
      ]
    }).compile();
    console.log('=== 模块编译完成 ===');

    service = module.get<PgCacheService>(PgCacheService);
    console.log('=== 服务获取完成 ===');
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it('追踪 set/get 流程', async () => {
    const key = 'trace:test:' + Date.now();
    const value = 'trace value';
    
    console.log('\n=== 开始设置 ===');
    console.log('键:', key);
    console.log('值:', value);
    
    // 1. 检查服务状态
    console.log('服务状态:', !!service);
    console.log('客户端状态:', !!service.getClient());
    
    // 2. 设置值
    console.log('\n=== 执行 set ===');
    const setResult = await service.set(key, value);
    console.log('set 返回结果:', setResult);
    
    // 3. 直接从底层客户端获取（绕过我们的 get 方法）
    console.log('\n=== 底层客户端获取 ===');
    const client = service.getClient();
    console.log('客户端类型:', typeof client);
    
    const rawResult = await client.get(key);
    console.log('底层获取结果:', rawResult);
    console.log('底层结果类型:', typeof rawResult);
    console.log('底层结果 === null:', rawResult === null);
    console.log('底层结果 === undefined:', rawResult === undefined);
    
    // 4. 通过我们的 get 方法获取
    console.log('\n=== 服务层 get ===');
    const getResult = await service.get(key);
    console.log('get 返回结果:', getResult);
    console.log('get 结果类型:', typeof getResult);
    console.log('get 结果 === null:', getResult === null);
    
    // 5. 测试结论
    console.log('\n=== 测试结论 ===');
    console.log('set 成功:', setResult === 'OK');
    console.log('底层有数据:', rawResult !== null && rawResult !== undefined);
    console.log('get 有数据:', getResult !== null);
    
    expect(setResult).toBe('OK');
    expect(rawResult).toBe(value);
    expect(getResult).toBe(value);
  }, 15000);
});