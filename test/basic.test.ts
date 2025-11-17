import { Test, TestingModule } from '@nestjs/testing';
import { PgCacheModule, PgCacheService } from '../src';

describe('Basic PgCache Tests', () => {
  let service: PgCacheService;
  let module: TestingModule;

  beforeAll(async () => {
    // 简单的初始化测试
    module = await Test.createTestingModule({
      imports: [
        PgCacheModule.forRoot({
          cache: {
            uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
            table: 'basic_test_cache'
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

  it('应该能够初始化服务', () => {
    expect(service).toBeDefined();
    expect(service.getClient()).toBeDefined();
  });

  it('应该能够设置和获取字符串', async () => {
    const key = 'basic:string:test';
    const value = 'Hello World';

    const setResult = await service.set(key, value);
    expect(setResult).toBe('OK');

    const getResult = await service.get(key);
    expect(getResult).toBe(value);

    // 清理
    await service.del(key);
  }, 10000);

  it('应该能够设置和获取对象', async () => {
    const key = 'basic:object:test';
    const value = { id: 1, name: 'Test', active: true };

    const setResult = await service.set(key, value);
    expect(setResult).toBe('OK');

    const getResult = await service.get(key);
    expect(getResult).toEqual(value);

    // 清理
    await service.del(key);
  }, 10000);

  it('应该能够处理不存在的键', async () => {
    const result = await service.get('basic:nonexistent:key');
    expect(result).toBeNull();
  }, 5000);

  it('应该支持 exists 方法', async () => {
    const key = 'basic:exists:test';
    
    // 键不存在时
    const exists1 = await service.exists(key);
    expect(exists1).toBe(0);
    
    // 设置键
    await service.set(key, 'value');
    
    // 键存在时
    const exists2 = await service.exists(key);
    expect(exists2).toBe(1);

    // 清理
    await service.del(key);
  }, 10000);
});