import { Test, TestingModule } from '@nestjs/testing';
import { PgCacheModule, PgCacheService } from '../src';

describe('PgCacheService Working Tests', () => {
  let service: PgCacheService;
  let module: TestingModule;

  // 测试数据库配置
  const testDbConfig = {
    cache: {
      uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
      table: 'working_test_cache',
      ttl: 60000 // 1分钟
    }
  };

  beforeAll(async () => {
    // 初始化测试模块
    module = await Test.createTestingModule({
      imports: [PgCacheModule.forRoot(testDbConfig)]
    }).compile();

    service = module.get<PgCacheService>(PgCacheService);
    
    // 等待一段时间确保连接完全建立
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    if (service) {
      await service.reset();
    }
    if (module) {
      await module.close();
    }
  });

  beforeEach(async () => {
    // 每个测试前清空缓存
    await service.reset();
  });

  describe('基础缓存操作', () => {
    it('应该能够设置和获取字符串值', async () => {
      const key = 'working:string:' + Date.now();
      const value = 'Hello, World!';

      console.log('测试字符串:', key, '=', value);

      // 设置值
      const setResult = await service.set(key, value);
      expect(setResult).toBe('OK');
      console.log('设置成功:', setResult);

      // 等待一小段时间确保数据写入
      await new Promise(resolve => setTimeout(resolve, 100));

      // 获取值
      const getResult = await service.get(key);
      console.log('获取结果:', getResult);
      expect(getResult).toBe(value);
    });

    it('应该能够设置和获取对象值', async () => {
      const key = 'working:object:' + Date.now();
      const value = { id: 1, name: 'Test User', active: true };

      console.log('测试对象:', key, '=', value);

      // 设置值
      const setResult = await service.set(key, value);
      expect(setResult).toBe('OK');
      console.log('设置成功:', setResult);

      // 等待一小段时间确保数据写入
      await new Promise(resolve => setTimeout(resolve, 100));

      // 获取值
      const getResult = await service.get(key);
      console.log('获取结果:', getResult);
      expect(getResult).toEqual(value);
    });

    it('应该能够处理不存在的键', async () => {
      const result = await service.get('working:nonexistent');
      expect(result).toBeNull();
    });

    it('应该能够删除键', async () => {
      const key = 'working:delete:' + Date.now();
      const value = 'to be deleted';

      // 设置值
      await service.set(key, value);
      
      // 等待确保写入
      await new Promise(resolve => setTimeout(resolve, 100));
      
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
        `working:mget:1:${timestamp}`,
        `working:mget:2:${timestamp}`,
        `working:mget:3:${timestamp}`
      ];
      const values = ['value1', 'value2', 'value3'];

      // 设置多个值
      for (let i = 0; i < keys.length; i++) {
        await service.set(keys[i], values[i]);
      }

      // 等待确保所有数据写入
      await new Promise(resolve => setTimeout(resolve, 200));

      // 批量获取
      const results = await service.mget(keys);
      console.log('批量获取结果:', results);
      expect(results).toEqual(values);

      // 清理
      await service.del(keys);
    });
  });

  describe('Redis 兼容方法', () => {
    it('exists 应该检查键是否存在', async () => {
      const key = 'working:exists:' + Date.now();

      // 键不存在时应该返回 0
      const exists1 = await service.exists(key);
      expect(exists1).toBe(0);

      // 设置键
      await service.set(key, 'value');
      
      // 等待确保写入
      await new Promise(resolve => setTimeout(resolve, 100));

      // 键存在时应该返回 1
      const exists2 = await service.exists(key);
      expect(exists2).toBe(1);
    });

    it('setnx 应该只在键不存在时设置', async () => {
      const key = 'working:setnx:' + Date.now();
      const value1 = 'first';
      const value2 = 'second';

      // 第一次设置应该成功
      const result1 = await service.setnx(key, value1);
      expect(result1).toBe(1);
      
      // 等待确保写入
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(await service.get(key)).toBe(value1);

      // 第二次设置应该失败
      const result2 = await service.setnx(key, value2);
      expect(result2).toBe(0);
      
      // 等待确保状态稳定
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(await service.get(key)).toBe(value1); // 值不变
    });

    it('strlen 应该返回字符串值的长度', async () => {
      const key = 'working:strlen:' + Date.now();
      const stringValue = 'Hello, NestJS!';
      const objectValue = { message: 'test' };

      // 测试字符串值
      await service.set(key + ':string', stringValue);
      
      // 等待确保写入
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const length1 = await service.strlen(key + ':string');
      expect(length1).toBe(stringValue.length);

      // 测试对象值（JSON序列化后的长度）
      await service.set(key + ':object', objectValue);
      
      // 等待确保写入
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const length2 = await service.strlen(key + ':object');
      expect(length2).toBe(JSON.stringify(objectValue).length);
    });
  });

  describe('哈希操作', () => {
    it('哈希操作应该正常工作', async () => {
      const hashKey = 'working:hash:' + Date.now();
      const field = 'test_field';
      const value = 'hash value';

      // 设置哈希字段
      const hsetResult = await service.hset(hashKey, field, value);
      expect(hsetResult).toBe('OK');

      // 等待确保写入
      await new Promise(resolve => setTimeout(resolve, 100));

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
  });

  describe('向后兼容方法', () => {
    it('getValue 和 setValue 应该正常工作', async () => {
      const key = 'working:compat:' + Date.now();
      const value = { test: 'compatibility' };

      // 使用 setValue
      const setResult = await service.setValue(key, value);
      expect(setResult).toBe(true);

      // 等待确保写入
      await new Promise(resolve => setTimeout(resolve, 100));

      // 使用 getValue
      const getResult = await service.getValue(key);
      expect(getResult).toEqual(value);
    });

    it('deleteKey 和 hasKey 应该正常工作', async () => {
      const key = 'working:compat2:' + Date.now();

      await service.setValue(key, 'value');
      
      // 等待确保写入
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(await service.hasKey(key)).toBe(true);

      const deleteResult = await service.deleteKey(key);
      expect(deleteResult).toBe(true);

      expect(await service.hasKey(key)).toBe(false);
    });
  });

  describe('错误处理', () => {
    it('应该处理空键值', async () => {
      const setResult = await service.set('', 'value');
      expect(setResult).toBeNull();

      const getResult = await service.get('');
      expect(getResult).toBeNull();
    });

    it('应该处理空键数组', async () => {
      const result1 = await service.mget([]);
      expect(result1).toEqual([]);

      const result2 = await service.del([]);
      expect(result2).toBe(0);
    });
  });
});