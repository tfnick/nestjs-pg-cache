import { Test, TestingModule } from '@nestjs/testing';
import { PgCacheModule, PgCacheService } from '../src';

describe('Debug Test', () => {
  let service: PgCacheService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        PgCacheModule.forRoot({
          cache: {
            uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
            table: 'debug_test_cache'
          }
        })
      ]
    }).compile();

    service = module.get<PgCacheService>(PgCacheService);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it('调试 set/get 字符串问题', async () => {
    const key = 'debug:string:' + Date.now(); // 使用时间戳避免冲突
    const value = 'Hello, World!';
    
    console.log('原始值:', value, '类型:', typeof value);
    
    // 设置值
    const setResult = await service.set(key, value);
    console.log('set结果:', setResult);
    
    // 直接从底层缓存获取（不通过我们的 get 方法）
    const rawResult = await service.getClient().get(key);
    console.log('原始缓存结果:', rawResult, '类型:', typeof rawResult);
    
    // 尝试解析
    try {
      const parsed = JSON.parse(rawResult);
      console.log('JSON解析结果:', parsed);
    } catch (e: any) {
      console.log('JSON解析失败:', e?.message);
    }
    
    // 通过我们的 get 方法获取
    const getResult = await service.get(key);
    console.log('get方法结果:', getResult, '类型:', typeof getResult);
    
    expect(setResult).toBe('OK');
    expect(getResult).toBe(value);
    
    // 清理
    await service.del(key);
  });

  it('调试 set/get 对象问题', async () => {
    const key = 'debug:object:' + Date.now(); // 使用时间戳避免冲突
    const value = { id: 1, name: 'Test' };
    
    console.log('原始对象:', value, '类型:', typeof value);
    
    // 设置值
    const setResult = await service.set(key, value);
    console.log('set结果:', setResult);
    
    // 直接从底层缓存获取
    const rawResult = await service.getClient().get(key);
    console.log('原始缓存结果:', rawResult, '类型:', typeof rawResult);
    
    // 通过我们的 get 方法获取
    const getResult = await service.get(key);
    console.log('get方法结果:', getResult, '类型:', typeof getResult);
    
    expect(setResult).toBe('OK');
    expect(getResult).toEqual(value);
    
    // 清理
    await service.del(key);
  });
});