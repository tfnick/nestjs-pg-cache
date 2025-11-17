import { Test, TestingModule } from '@nestjs/testing';
import { PgCacheModule, PgCacheService } from '../src';
import { Cacheable, CacheEvict, CachePut } from '../src/decorators/keyv-cache.decorator';

describe('PgCacheService Integration Tests', () => {
  let service: PgCacheService;
  let module: TestingModule;

  // 测试数据库配置（使用内存数据库或测试数据库）
  const testDbConfig = {
    cache: {
      uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
      table: 'test_cache_table',
      ttl: 60000 // 1分钟
    }
  };

  beforeAll(async () => {
    // 初始化测试模块
    module = await Test.createTestingModule({
      imports: [PgCacheModule.forRoot(testDbConfig)]
    }).compile();

    service = module.get<PgCacheService>(PgCacheService);
  });

  afterAll(async () => {
    // 清理缓存数据
    if (service) {
      await service.reset();
    }
    // 关闭测试模块
    if (module) {
      await module.close();
    }
  });

  beforeEach(async () => {
    // 每个测试前清空缓存
    await service.reset();
  });

  describe('模块初始化', () => {
    it('应该成功初始化 PgCacheService', () => {
      expect(service).toBeDefined();
      expect(service.getClient()).toBeDefined();
    });

    it('应该能够获取客户端实例', () => {
      const client = service.getClient();
      expect(client).toBeDefined();
    });
  });

  describe('基础缓存操作', () => {
    it('应该能够设置和获取字符串值', async () => {
      const key = 'test:string';
      const value = 'Hello, World!';

      // 设置值
      const setResult = await service.set(key, value);
      expect(setResult).toBe('OK');

      // 获取值
      const getResult = await service.get(key);
      expect(getResult).toBe(value);
    });

    it('应该能够设置和获取对象值', async () => {
      const key = 'test:object';
      const value = { id: 1, name: 'Test User', active: true };

      // 设置值
      const setResult = await service.set(key, value);
      expect(setResult).toBe('OK');

      // 获取值
      const getResult = await service.get(key);
      expect(getResult).toEqual(value);
    });

    it('应该能够处理不存在的键', async () => {
      const result = await service.get('nonexistent:key');
      expect(result).toBeNull();
    });

    it('应该能够设置带过期时间的值', async () => {
      const key = 'test:ttl';
      const value = 'expires soon';
      const ttl = 1000; // 1秒

      const setResult = await service.set(key, value, ttl);
      expect(setResult).toBe('OK');

      // 立即获取应该成功
      const getResult = await service.get(key);
      expect(getResult).toBe(value);

      // 等待过期时间后再获取（在实际测试中可能需要调整）
      // await new Promise(resolve => setTimeout(resolve, 1100));
      // const expiredResult = await service.get(key);
      // expect(expiredResult).toBeNull();
    });

    it('应该能够批量获取值', async () => {
      const keys = ['test:mget:1', 'test:mget:2', 'test:mget:3'];
      const values = ['value1', 'value2', 'value3'];

      // 设置多个值
      for (let i = 0; i < keys.length; i++) {
        await service.set(keys[i], values[i]);
      }

      // 批量获取
      const results = await service.mget(keys);
      expect(results).toEqual(values);
    });

    it('应该能够删除键', async () => {
      const key = 'test:delete';
      const value = 'to be deleted';

      // 设置值
      await service.set(key, value);
      expect(await service.get(key)).toBe(value);

      // 删除键
      const deleteResult = await service.del(key);
      expect(deleteResult).toBe(1);

      // 确认键已删除
      const getResult = await service.get(key);
      expect(getResult).toBeNull();
    });

    it('应该能够批量删除键', async () => {
      const keys = ['test:del:1', 'test:del:2', 'test:del:3'];

      // 设置多个值
      for (const key of keys) {
        await service.set(key, 'value');
      }

      // 批量删除
      const deleteResult = await service.del(keys);
      expect(deleteResult).toBe(3);

      // 确认所有键都已删除
      for (const key of keys) {
        const getResult = await service.get(key);
        expect(getResult).toBeNull();
      }
    });
  });

  describe('Redis 兼容方法', () => {
    it('setnx 应该只在键不存在时设置', async () => {
      const key = 'test:setnx';
      const value1 = 'first';
      const value2 = 'second';

      // 第一次设置应该成功
      const setResult1 = await service.setnx(key, value1);
      expect(setResult1).toBe(1);
      expect(await service.get(key)).toBe(value1);

      // 第二次设置应该失败
      const setResult2 = await service.setnx(key, value2);
      expect(setResult2).toBe(0);
      expect(await service.get(key)).toBe(value1); // 值不变
    });

    it('setex 应该只在键存在时更新', async () => {
      const key = 'test:setex';
      const value1 = 'original';
      const value2 = 'updated';

      // 在键不存在时应该失败
      const setResult1 = await service.setex(key, value1);
      expect(setResult1).toBeNull();

      // 先创建键
      await service.set(key, value1);
      expect(await service.get(key)).toBe(value1);

      // 现在更新应该成功
      const setResult2 = await service.setex(key, value2);
      expect(setResult2).toBe('OK');
      expect(await service.get(key)).toBe(value2);
    });

    it('exists 应该检查键是否存在', async () => {
      const key = 'test:exists';

      // 键不存在时应该返回 0
      const exists1 = await service.exists(key);
      expect(exists1).toBe(0);

      // 设置键
      await service.set(key, 'value');

      // 键存在时应该返回 1
      const exists2 = await service.exists(key);
      expect(exists2).toBe(1);
    });

    it('strlen 应该返回字符串值的长度', async () => {
      const key = 'test:strlen';
      const stringValue = 'Hello, NestJS!';
      const objectValue = { message: 'test' };

      // 测试字符串值
      await service.set(key, stringValue);
      const length1 = await service.strlen(key);
      expect(length1).toBe(stringValue.length);

      // 测试对象值（JSON序列化后的长度）
      await service.set(key, objectValue);
      const length2 = await service.strlen(key);
      expect(length2).toBe(JSON.stringify(objectValue).length);

      // 不存在的键应该返回 0
      const length3 = await service.strlen('nonexistent');
      expect(length3).toBe(0);
    });

    it('哈希操作应该正常工作', async () => {
      const hashKey = 'test:hash';
      const field = 'field1';
      const value = 'hash value';

      // 设置哈希字段
      const hsetResult = await service.hset(hashKey, field, value);
      expect(hsetResult).toBe('OK');

      // 获取哈希字段
      const hgetResult = await service.hget(hashKey, field);
      expect(hgetResult).toBe(value);

      // 检查字段是否存在
      const hexistsResult = await service.hexists(hashKey, field);
      expect(hexistsResult).toBe(1);

      // 删除哈希字段
      const hdelResult = await service.hdel(hashKey, field);
      expect(hdelResult).toBe(1);

      // 确认字段已删除
      const hgetAfterDelete = await service.hget(hashKey, field);
      expect(hgetAfterDelete).toBeNull();
    });

    it('批量哈希操作应该正常工作', async () => {
      const hashKey = 'test:hmset';
      const data = {
        field1: 'value1',
        field2: 'value2',
        field3: 'value3'
      };

      // 批量设置哈希字段
      const hmsetResult = await service.hmset(hashKey, data);
      expect(hmsetResult).toBe(3); // 设置了3个字段

      // 获取各个字段
      expect(await service.hget(hashKey, 'field1')).toBe('value1');
      expect(await service.hget(hashKey, 'field2')).toBe('value2');
      expect(await service.hget(hashKey, 'field3')).toBe('value3');
    });
  });

  describe('向后兼容方法', () => {
    it('getValue 和 setValue 应该正常工作', async () => {
      const key = 'test:compat';
      const value = { test: 'compatibility' };

      // 使用 setValue
      const setResult = await service.setValue(key, value);
      expect(setResult).toBe(true);

      // 使用 getValue
      const getResult = await service.getValue(key);
      expect(getResult).toEqual(value);
    });

    it('deleteKey 应该正常工作', async () => {
      const key = 'test:deletekey';

      await service.setValue(key, 'value');
      const deleteResult = await service.deleteKey(key);
      expect(deleteResult).toBe(true);

      const getResult = await service.getValue(key);
      expect(getResult).toBeUndefined();
    });

    it('hasKey 应该检查键是否存在', async () => {
      const key = 'test:haskey';

      // 键不存在
      expect(await service.hasKey(key)).toBe(false);

      await service.setValue(key, 'value');

      // 键存在
      expect(await service.hasKey(key)).toBe(true);
    });

    it('clearCache 应该清空所有缓存', async () => {
      // 设置一些测试数据
      await service.setValue('test:clear1', 'value1');
      await service.setValue('test:clear2', 'value2');

      // 确认数据存在
      expect(await service.hasKey('test:clear1')).toBe(true);
      expect(await service.hasKey('test:clear2')).toBe(true);

      // 清空缓存
      await service.clearCache();

      // 确认数据已清空
      expect(await service.hasKey('test:clear1')).toBe(false);
      expect(await service.hasKey('test:clear2')).toBe(false);
    });
  });

  describe('错误处理', () => {
    it('应该处理空键值', async () => {
      const setResult1 = await service.set('', 'value');
      expect(setResult1).toBeNull();

      const getResult1 = await service.get('');
      expect(getResult1).toBeNull();

      const getResult2 = await service.get(null as any);
      expect(getResult2).toBeNull();
    });

    it('应该处理空键数组', async () => {
      const result1 = await service.mget([]);
      expect(result1).toEqual([]);

      const result2 = await service.del([]);
      expect(result2).toBe(0);
    });
  });
});