import { Test, TestingModule } from '@nestjs/testing';
import { PgCacheModule } from '../src';
import { PgCacheServiceSimple } from '../src/services/pg-cache.service.simple';

describe('PgCacheService Simple Tests', () => {
  let service: PgCacheServiceSimple;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        PgCacheModule.forRoot({
          cache: {
            uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
            table: 'simple_test_cache'
          }
        })
      ],
      providers: [PgCacheServiceSimple]
    }).compile();

    service = module.get<PgCacheServiceSimple>(PgCacheServiceSimple);
  });

  afterAll(async () => {
    if (service) {
      await service.reset();
    }
    if (module) {
      await module.close();
    }
  });

  describe('基础功能测试', () => {
    it('应该成功初始化服务', () => {
      expect(service).toBeDefined();
      expect(service.getClient()).toBeDefined();
    });

    it('应该能够设置和获取字符串值', async () => {
      const key = 'simple:string:' + Date.now();
      const value = 'Hello, World!';

      // 设置值
      const setResult = await service.set(key, value);
      console.log('Set result:', setResult);
      expect(setResult).toBe('OK');

      // 获取值
      const getResult = await service.get(key);
      console.log('Get result:', getResult);
      expect(getResult).toBe(value);

      // 清理
      await service.del(key);
    });

    it('应该能够设置和获取对象值', async () => {
      const key = 'simple:object:' + Date.now();
      const value = { id: 1, name: 'Test User', active: true };

      // 设置值
      const setResult = await service.set(key, value);
      console.log('Object set result:', setResult);
      expect(setResult).toBe('OK');

      // 获取值
      const getResult = await service.get(key);
      console.log('Object get result:', getResult);
      expect(getResult).toEqual(value);

      // 清理
      await service.del(key);
    });

    it('应该能够处理不存在的键', async () => {
      const result = await service.get('simple:nonexistent');
      expect(result).toBeNull();
    });

    it('应该能够删除键', async () => {
      const key = 'simple:delete:' + Date.now();
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

    it('应该能够批量获取值', async () => {
      const timestamp = Date.now();
      const keys = [
        `simple:mget:1:${timestamp}`,
        `simple:mget:2:${timestamp}`,
        `simple:mget:3:${timestamp}`
      ];
      const values = ['value1', 'value2', 'value3'];

      // 设置多个值
      for (let i = 0; i < keys.length; i++) {
        await service.set(keys[i], values[i]);
      }

      // 批量获取
      const results = await service.mget(keys);
      console.log('Mget results:', results);
      expect(results).toEqual(values);

      // 清理
      await service.del(keys);
    });

    it('应该支持 exists 方法', async () => {
      const key = 'simple:exists:' + Date.now();

      // 键不存在时应该返回 0
      const exists1 = await service.exists(key);
      expect(exists1).toBe(0);

      // 设置键
      await service.set(key, 'value');

      // 键存在时应该返回 1
      const exists2 = await service.exists(key);
      expect(exists2).toBe(1);

      // 清理
      await service.del(key);
    });

    it('应该支持 setnx 方法', async () => {
      const key = 'simple:setnx:' + Date.now();
      const value1 = 'first';
      const value2 = 'second';

      // 第一次设置应该成功
      const result1 = await service.setnx(key, value1);
      expect(result1).toBe(1);
      expect(await service.get(key)).toBe(value1);

      // 第二次设置应该失败
      const result2 = await service.setnx(key, value2);
      expect(result2).toBe(0);
      expect(await service.get(key)).toBe(value1); // 值不变

      // 清理
      await service.del(key);
    });

    it('应该支持 strlen 方法', async () => {
      const key = 'simple:strlen:' + Date.now();
      const stringValue = 'Hello, NestJS!';
      const objectValue = { message: 'test' };

      // 测试字符串值
      await service.set(key + ':string', stringValue);
      const length1 = await service.strlen(key + ':string');
      expect(length1).toBe(stringValue.length);

      // 测试对象值（JSON序列化后的长度）
      await service.set(key + ':object', objectValue);
      const length2 = await service.strlen(key + ':object');
      expect(length2).toBe(JSON.stringify(objectValue).length);

      // 清理
      await service.del([key + ':string', key + ':object']);
    });

    it('应该支持哈希操作', async () => {
      const hashKey = 'simple:hash:' + Date.now();
      const field = 'test_field';
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

    it('应该支持批量哈希删除', async () => {
      const hashKey = 'simple:hbatch:' + Date.now();
      const fields = ['field1', 'field2', 'field3'];
      const values = ['value1', 'value2', 'value3'];

      // 设置多个字段
      for (let i = 0; i < fields.length; i++) {
        await service.hset(hashKey, fields[i], values[i]);
      }

      // 批量删除
      const hdelResult = await service.hdel(hashKey, fields);
      expect(hdelResult).toBe(3);

      // 确认所有字段都已删除
      for (const field of fields) {
        const result = await service.hget(hashKey, field);
        expect(result).toBeNull();
      }
    });
  });

  describe('错误处理', () => {
    it('应该处理空键值', async () => {
      const setResult = await service.set('', 'value');
      expect(setResult).toBeNull();

      const getResult = await service.get('');
      expect(getResult).toBeNull();

      const getResult2 = await service.get(null as any);
      expect(getResult2).toBeNull();
    });

    it('应该处理空键数组', async () => {
      const result1 = await service.mget([]);
      expect(result1).toEqual([]);

      const result2 = await service.del([]);
      expect(result2).toBe(0);
    });

    it('应该处理 reset 方法', async () => {
      // 设置一些测试数据
      await service.set('reset:test1', 'value1');
      await service.set('reset:test2', 'value2');

      // 确认数据存在
      expect(await service.hasKey('reset:test1')).toBe(true);
      expect(await service.hasKey('reset:test2')).toBe(true);

      // 清空缓存
      const resetResult = await service.reset();
      expect(resetResult).toBe(1);

      // 确认数据已清空
      expect(await service.hasKey('reset:test1')).toBe(false);
      expect(await service.hasKey('reset:test2')).toBe(false);
    });
  });
});