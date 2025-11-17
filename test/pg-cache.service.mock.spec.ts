import { Test, TestingModule } from '@nestjs/testing';
import { PgCacheModule, PgCacheService } from '../src';

// 模拟测试，不依赖真实数据库
describe('PgCacheService Mock Tests', () => {
  let service: PgCacheService;
  let module: TestingModule;

  beforeAll(async () => {
    // 使用内存中的模拟配置（如果数据库不可用）
    module = await Test.createTestingModule({
      imports: [
        PgCacheModule.forRoot({
          cache: {
            // 这里可以尝试连接，如果失败会跳过测试
            uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
            table: 'mock_test_cache'
          }
        })
      ]
    }).compile();

    try {
      service = module.get<PgCacheService>(PgCacheService);
      // 测试连接
      await service.set('connection:test', 'test');
      await service.get('connection:test');
      // 清理测试数据
      await service.del('connection:test');
    } catch (error) {
      console.warn('Database not available, skipping integration tests');
      await module.close();
      throw new Error('SKIP_DB_TESTS');
    }
  });

  afterAll(async () => {
    if (service) {
      try {
        await service.reset();
      } catch (error) {
        // 忽略清理错误
      }
    }
    if (module) {
      await module.close();
    }
  });

  beforeEach(async () => {
    // 每个测试前清空缓存，确保测试隔离
    if (service) {
      try {
        await service.reset();
      } catch (error) {
        // 忽略清理错误
      }
    }
  });

  describe('基础功能模拟测试', () => {
    it('应该成功初始化服务', () => {
      expect(service).toBeDefined();
      expect(service.getClient()).toBeDefined();
    });

    it('应该能够设置和获取值', async () => {
      const key = 'mock:test:string';
      const value = 'Hello, Mock World!';

      await service.set(key, value);
      const result = await service.get(key);
      expect(result).toBe(value);
    });

    it('应该处理不存在的键', async () => {
      const result = await service.get('mock:nonexistent');
      expect(result).toBeNull();
    });

    it('应该能够删除键', async () => {
      const key = 'mock:delete';
      await service.set(key, 'value to delete');
      
      const deleteResult = await service.del(key);
      expect(deleteResult).toBe(1);
      
      const getResult = await service.get(key);
      expect(getResult).toBeNull();
    });

    it('应该支持 exists 方法', async () => {
      const key = 'mock:exists';
      
      // 键不存在时
      expect(await service.exists(key)).toBe(0);
      
      // 设置键后
      await service.set(key, 'value');
      expect(await service.exists(key)).toBe(1);
    });

    it('应该支持 setnx 方法', async () => {
      const key = 'mock:setnx';
      
      // 第一次设置应该成功
      const result1 = await service.setnx(key, 'first');
      expect(result1).toBe(1);
      expect(await service.get(key)).toBe('first');
      
      // 第二次设置应该失败
      const result2 = await service.setnx(key, 'second');
      expect(result2).toBe(0);
      expect(await service.get(key)).toBe('first');
    });

    it('应该处理对象序列化', async () => {
      const key = 'mock:object';
      const value = { id: 1, name: 'Test', active: true };

      await service.set(key, value);
      const result = await service.get(key);
      expect(result).toEqual(value);
    });
  });

  describe('错误处理', () => {
    it('应该处理空键值', async () => {
      const setResult = await service.set('', 'value');
      expect(setResult).toBeNull();

      const getResult = await service.get('');
      expect(getResult).toBeNull();
    });

    it('应该处理 undefined 键', async () => {
      const setResult = await service.set(undefined as any, 'value');
      expect(setResult).toBeNull();

      const getResult = await service.get(undefined as any);
      expect(getResult).toBeNull();
    });

    it('应该处理批量操作', async () => {
      const keys = ['mock:mget:1', 'mock:mget:2', 'mock:mget:3'];
      const values = ['value1', 'value2', 'value3'];

      // 设置多个值
      for (let i = 0; i < keys.length; i++) {
        await service.set(keys[i], values[i]);
      }

      // 批量获取
      const results = await service.mget(keys);
      expect(results).toEqual(values);

      // 批量删除
      const deleteResult = await service.del(keys);
      expect(deleteResult).toBe(3);

      // 确认删除
      for (const key of keys) {
        expect(await service.get(key)).toBeNull();
      }
    });
  });
});